import Api from './api/api';
import ApiUtils from './api/api-utils';
import { timeToHHMMSS, isPatternValid } from './utils/helpers';
import log from './ui/logic/log';
import * as filters from './filters';
import { apiSettingsDefault } from './api/api-utils-default-presets';

export type Source = 'library' | 'search' | 'trash' | 'lockedFolder' | 'favorites' | 'sharedLinks' | 'albums';

export type MediaItem = any;
export type Filter = any;
export type Action = any;
export type ApiSettings = typeof apiSettingsDefault;

interface ExecuteActionParams {
  mediaItems: MediaItem[];
  source: Source | string;
  targetAlbum?: any;
  newTargetAlbumName?: string;
  preserveOrder?: boolean;
}

export default class Core {
  isProcessRunning: boolean;
  api: Api;
  apiUtils!: ApiUtils;
  constructor() {
    this.isProcessRunning = false;
    this.api = new Api();
  }

  async getAndFilterMedia(filter: Filter, source: Source): Promise<MediaItem[]> {
    const mediaItems = await this.fetchMediaItems(source, filter);
    log(`Found items: ${mediaItems.length}`);
    if (!this.isProcessRunning || !mediaItems?.length) return mediaItems;

    const filteredItems = await this.applyFilters(mediaItems, filter, source);
    return filteredItems;
  }

  async fetchMediaItems(source: Source, filter: Filter): Promise<MediaItem[]> {
    const sourceHandlers: Record<Source, () => Promise<any>> = {
      library: async () => {
        log('Reading library');
        return filter.dateType === 'uploaded' ? await this.getLibraryItemsByUploadDate(filter) : await this.getLibraryItemsByTakenDate(filter);
      },
      search: async () => {
        log('Reading search results');
        return await this.apiUtils.getAllSearchItems(filter.searchQuery);
      },
      trash: async () => {
        log('Getting trash items');
        return await this.apiUtils.getAllTrashItems();
      },
      lockedFolder: async () => {
        log('Getting locked folder items');
        return await this.apiUtils.getAllLockedFolderItems();
      },
      favorites: async () => {
        log('Getting favorite items');
        return await this.apiUtils.getAllFavoriteItems();
      },
      sharedLinks: async () => {
        log('Getting shared links');
        const sharedLinks = await this.apiUtils.getAllSharedLinks();
        if (!sharedLinks) {
          log('No shared links found', 'error');
          return [];
        }
        log(`Shared Links Found: ${sharedLinks.length}`);
        const sharedLinkItems = await Promise.all(
          sharedLinks.map(async (sharedLink: any) => {
            log('Getting shared link items');
            return await this.apiUtils.getAllMediaInSharedLink(sharedLink.linkId);
          })
        );
        return sharedLinkItems.flat();
      },
      albums: async () => {
        if (!filter.albumsInclude) {
          log('No target album!', 'error');
          throw new Error('no target album');
        }
        const albumMediaKeys = Array.isArray(filter.albumsInclude) ? filter.albumsInclude : [filter.albumsInclude];
        const albumItems = await Promise.all(
          albumMediaKeys.map(async (albumMediaKey: any) => {
            log('Getting album items');
            return await this.apiUtils.getAllMediaInAlbum(albumMediaKey);
          })
        );
        return albumItems.flat();
      },
    };

    const handler = sourceHandlers[source];
    if (!handler) {
      log(`Unknown source: ${source}`, 'error');
      return [];
    }

    const mediaItems = await handler();
    log('Source read complete');
    return mediaItems;
  }

  async applyFilters(mediaItems: MediaItem[], filter: Filter, source: Source | string): Promise<MediaItem[]> {
    let filteredItems = mediaItems;

    const filtersToApply: { condition: unknown; method: () => Promise<MediaItem[]> | MediaItem[] }[] = [
      {
        condition: source !== 'library' && (filter.lowerBoundaryDate || filter.higherBoundaryDate),
        method: () => filters.filterByDate(filteredItems, filter),
      },
      {
        condition: filter.albumsExclude,
        method: async () => await this.excludeAlbumItems(filteredItems, filter),
      },
      {
        condition: filter.excludeShared,
        method: async () => await this.excludeSharedItems(filteredItems),
      },
      {
        condition: filter.owned,
        method: () => filters.filterOwned(filteredItems, filter),
      },
      {
        condition: filter.uploadStatus,
        method: () => filters.filterByUploadStatus(filteredItems, filter),
      },
      {
        condition: filter.archived,
        method: () => filters.filterArchived(filteredItems, filter),
      },
      {
        condition: filter.favorite || filter.excludeFavorites,
        method: () => filters.filterFavorite(filteredItems, filter),
      },
      {
        condition: filter.type,
        method: () => filters.filterByMediaType(filteredItems, filter),
      },
    ];
    // filtering with basic filters
    let i = 0;
    do {
      const { condition, method } = filtersToApply[i]!;
      if (condition && filteredItems.length) {
        filteredItems = await method();
      }
      i++;
    } while (i < filtersToApply.length && filteredItems.length);

    // filtering with filters based on extended media info
    if (
      filteredItems.length &&
      (filter.space || filter.quality || filter.lowerBoundarySize || filter.higherBoundarySize || filter.fileNameRegex || filter.descriptionRegex)
    ) {
      filteredItems = await this.extendMediaItemsWithMediaInfo(filteredItems);

      const extendedFilters: { condition: unknown; method: () => Promise<MediaItem[]> | MediaItem[] }[] = [
        { condition: filter.fileNameRegex, method: () => filters.fileNameFilter(filteredItems, filter) },
        { condition: filter.descriptionRegex, method: () => filters.descriptionFilter(filteredItems, filter) },
        { condition: filter.space, method: () => filters.spaceFilter(filteredItems, filter) },
        { condition: filter.quality, method: () => filters.qualityFilter(filteredItems, filter) },
        {
          condition: filter.lowerBoundarySize || filter.higherBoundarySize,
          method: () => filters.sizeFilter(filteredItems, filter),
        },
      ];

      i = 0;
      do {
        const { condition, method } = extendedFilters[i]!;
        if (condition && filteredItems.length) {
          filteredItems = await method();
        }
        i++;
      } while (i < extendedFilters.length && filteredItems.length);
    }

    if (filter.sortBySize && filteredItems.length) {
      filteredItems = await this.extendMediaItemsWithMediaInfo(filteredItems);
      filteredItems.sort((a: MediaItem, b: MediaItem) => (b.size || 0) - (a.size || 0));
    }

    // filtering by similarity
    if (filteredItems.length > 0 && filter.similarityThreshold) {
      filteredItems = await filters.filterSimilar(this, filteredItems, filter);
    }

    return filteredItems;
  }

  async excludeAlbumItems(mediaItems: MediaItem[], filter: Filter): Promise<MediaItem[]> {
    const itemsToExclude: MediaItem[] = [];
    const albumMediaKeys = Array.isArray(filter.albumsExclude) ? filter.albumsExclude : [filter.albumsExclude];

    await Promise.all(
      albumMediaKeys.map(async (albumMediaKey: string) => {
        log('Getting album items to exclude');
        const excludedItems: MediaItem[] | undefined = await this.apiUtils.getAllMediaInAlbum(albumMediaKey);
        itemsToExclude.push(...(excludedItems || []));
      })
    );

    log('Excluding album items');
    return mediaItems.filter(
      (mediaItem: MediaItem) => !itemsToExclude.some((excludeItem: MediaItem) => excludeItem.dedupKey === mediaItem.dedupKey)
    );
  }

  async excludeSharedItems(mediaItems: MediaItem[]): Promise<MediaItem[]> {
    log('Getting shared links items to exclude');
    const itemsToExclude: MediaItem[] = [];
    const sharedLinks: any[] | undefined = await this.apiUtils.getAllSharedLinks();
    if (!sharedLinks || sharedLinks.length === 0) {
      log('No shared links found to exclude');
      return mediaItems;
    }

    await Promise.all(
      sharedLinks.map(async (sharedLink: any) => {
        const sharedLinkItems: MediaItem[] | undefined = await this.apiUtils.getAllMediaInSharedLink(sharedLink.linkId);
        itemsToExclude.push(...(sharedLinkItems || []));
      })
    );

    log('Excluding shared items');
    return mediaItems.filter(
      (mediaItem: MediaItem) => !itemsToExclude.some((excludeItem: MediaItem) => excludeItem.dedupKey === mediaItem.dedupKey)
    );
  }

  async extendMediaItemsWithMediaInfo(mediaItems: MediaItem[]): Promise<MediaItem[]> {
    const mediaInfoData: any[] = (await this.apiUtils.getBatchMediaInfoChunked(mediaItems)) || [];

    const extendedMediaItems = mediaItems.map((item: MediaItem) => {
      const matchingInfoItem = mediaInfoData.find((infoItem: any) => infoItem.mediaKey === item.mediaKey);
      return { ...item, ...matchingInfoItem };
    });
    return extendedMediaItems;
  }

  async getLibraryItemsByTakenDate(filter: Filter): Promise<MediaItem[] | void> {
    let source;
    if (filter.archived === 'true') {
      source = 'archive';
    } else if (filter.archived === 'false') {
      source = 'library';
    }

    let lowerBoundaryDate = new Date(filter.lowerBoundaryDate).getTime();
    let higherBoundaryDate = new Date(filter.higherBoundaryDate).getTime();

    lowerBoundaryDate = isNaN(lowerBoundaryDate) ? -Infinity : lowerBoundaryDate;
    higherBoundaryDate = isNaN(higherBoundaryDate) ? Infinity : higherBoundaryDate;

    const mediaItems: MediaItem[] = [];

    let nextPageId = null;
    const api: Api = this.api;

    if (Number.isInteger(lowerBoundaryDate || Number.isInteger(higherBoundaryDate)) && filter.intervalType === 'include') {
      let nextPageTimestamp = higherBoundaryDate !== Infinity ? higherBoundaryDate : null;
      do {
        if (!this.isProcessRunning) return;
        const mediaPage: any = await api.getItemsByTakenDate(nextPageTimestamp, source, nextPageId);
        nextPageId = mediaPage?.nextPageId;
        if (!mediaPage) break;
        nextPageTimestamp = mediaPage.lastItemTimestamp - 1;
        if (!mediaPage.items || mediaPage?.items?.length === 0) continue;
        mediaPage.items = mediaPage.items.filter((item: MediaItem) => item.timestamp >= lowerBoundaryDate && item.timestamp <= higherBoundaryDate);
        if (!mediaPage.items || mediaPage?.items?.length === 0) continue;
        log(`Found ${mediaPage?.items?.length} items`);
        mediaItems.push(...mediaPage.items);
      } while ((nextPageId && !nextPageTimestamp) || (nextPageTimestamp && nextPageTimestamp > lowerBoundaryDate));
    } else if (Number.isInteger(lowerBoundaryDate || Number.isInteger(higherBoundaryDate)) && filter.intervalType === 'exclude') {
      let nextPageTimestamp = null;
      do {
        if (!this.isProcessRunning) return;
        const mediaPage: any = await api.getItemsByTakenDate(nextPageTimestamp, source, nextPageId);
        nextPageId = mediaPage?.nextPageId;
        if (!mediaPage) break;
        nextPageTimestamp = mediaPage.lastItemTimestamp - 1;
        if (!mediaPage.items || mediaPage?.items?.length === 0) continue;
        mediaPage.items = mediaPage.items.filter((item: any) => item.timestamp < lowerBoundaryDate || item.timestamp > higherBoundaryDate);

        if (nextPageTimestamp > lowerBoundaryDate && nextPageTimestamp < higherBoundaryDate) {
          nextPageTimestamp = lowerBoundaryDate;
        } else {
          nextPageTimestamp = mediaPage.lastItemTimestamp - 1;
        }

        if (!mediaPage.items || mediaPage?.items?.length === 0) continue;

        log(`Found ${mediaPage?.items?.length} items`);
        mediaItems.push(...mediaPage.items);
      } while (nextPageId);
    } else {
      let nextPageTimestamp = null;
      do {
        if (!this.isProcessRunning) return;
        const mediaPage: any = await api.getItemsByTakenDate(nextPageTimestamp, source, nextPageId);
        nextPageId = mediaPage?.nextPageId;
        if (!mediaPage) break;
        nextPageTimestamp = mediaPage.lastItemTimestamp - 1;
        if (!mediaPage.items || mediaPage?.items?.length === 0) continue;
        log(`Found ${mediaPage?.items?.length} items`);
        mediaItems.push(...mediaPage.items);
      } while (nextPageId);
    }

    return mediaItems;
  }

  async getLibraryItemsByUploadDate(filter: Filter): Promise<MediaItem[] | void> {
    let lowerBoundaryDate = new Date(filter.lowerBoundaryDate).getTime();
    let higherBoundaryDate = new Date(filter.higherBoundaryDate).getTime();

    lowerBoundaryDate = isNaN(lowerBoundaryDate) ? -Infinity : lowerBoundaryDate;
    higherBoundaryDate = isNaN(higherBoundaryDate) ? Infinity : higherBoundaryDate;

    const mediaItems: MediaItem[] = [];

    let nextPageId = null;

    let skipTheRest = false;

    do {
      if (!this.isProcessRunning) return;
      const mediaPage: any = await this.api.getItemsByUploadedDate(nextPageId);
      const lastTimeStamp = mediaPage.items.at(-1).creationTimestamp;
      nextPageId = mediaPage?.nextPageId;
      if (!mediaPage) break;
      if (!mediaPage.items || mediaPage?.items?.length === 0) continue;
      if (filter.intervalType === 'include') {
        mediaPage.items = mediaPage.items.filter(
          (item: MediaItem) => item.creationTimestamp >= lowerBoundaryDate && item.creationTimestamp <= higherBoundaryDate
        );
        skipTheRest = lastTimeStamp < lowerBoundaryDate;
      } else if (filter.intervalType === 'exclude') {
        mediaPage.items = mediaPage.items.filter(
          (item: MediaItem) => item.creationTimestamp < lowerBoundaryDate || item.creationTimestamp > higherBoundaryDate
        );
      }
      if (!mediaPage.items || mediaPage?.items?.length === 0) continue;
      log(`Found ${mediaPage?.items?.length} items`);
      mediaItems.push(...mediaPage.items);
    } while (nextPageId && !skipTheRest);

    return mediaItems;
  }

  preChecks(filter: Filter): void {
    if (filter.fileNameRegex) {
      const isValid = isPatternValid(filter.fileNameRegex);
      if (isValid !== true) throw isValid;
    }
    if (filter.descriptionRegex) {
      const isValid = isPatternValid(filter.descriptionRegex);
      if (isValid !== true) throw isValid;
    }
    if (parseInt(filter.lowerBoundarySize) >= parseInt(filter.higherBoundarySize)) {
      throw new Error('Invalid Size Filter');
    }
  }

  async actionWithFilter(
    action: Action,
    filter: Filter,
    source: Source,
    targetAlbum: any,
    newTargetAlbumName: string,
    apiSettings?: ApiSettings
  ): Promise<void> {
    try {
      this.preChecks(filter);
    } catch (error: any) {
      log(String(error), 'error');
      return;
    }

    this.isProcessRunning = true;
    // dispatch event to upate the ui without importing it
    document.dispatchEvent(new Event('change'));
    this.apiUtils = new ApiUtils(this, apiSettings || apiSettingsDefault);

    try {
      const startTime = new Date();
      const mediaItems = await this.getAndFilterMedia(filter, source);

      // Early exit if no items to process
      if (!mediaItems?.length) {
        log('No items to process');
        return;
      }

      // Exit if process was stopped externally
      if (!this.isProcessRunning) return;

      // Execute the appropriate action
      await this.executeAction(action, {
        mediaItems,
        source,
        targetAlbum,
        newTargetAlbumName,
        preserveOrder: Boolean(filter.similarityThreshold || filter.sortBySize),
      });

      log(`Task completed in ${timeToHHMMSS(new Date().getTime() - startTime.getTime())}`, 'success');
    } catch (error: any) {
      log(error?.stack ?? String(error), 'error');
    } finally {
      this.isProcessRunning = false;
    }
  }

  async executeAction(action: Action, params: ExecuteActionParams): Promise<void> {
    const { mediaItems, source, targetAlbum, newTargetAlbumName, preserveOrder } = params;
    log(`Items to process: ${mediaItems?.length}`);
    if (action.elementId === 'restoreTrash' || source === 'trash') await this.apiUtils.restoreFromTrash(mediaItems);
    if (action.elementId === 'unLock' || source === 'lockedFolder') await this.apiUtils.removeFromLockedFolder(mediaItems);
    if (action.elementId === 'lock') await this.apiUtils.moveToLockedFolder(mediaItems);
    if (action.elementId === 'toExistingAlbum') await this.apiUtils.addToExistingAlbum(mediaItems, targetAlbum, preserveOrder);
    if (action.elementId === 'toNewAlbum') await this.apiUtils.addToNewAlbum(mediaItems, newTargetAlbumName, preserveOrder);
    if (action.elementId === 'toTrash') await this.apiUtils.moveToTrash(mediaItems);
    if (action.elementId === 'toArchive') await this.apiUtils.sendToArchive(mediaItems);
    if (action.elementId === 'unArchive') await this.apiUtils.unArchive(mediaItems);
    if (action.elementId === 'toFavorite') await this.apiUtils.setAsFavorite(mediaItems);
    if (action.elementId === 'unFavorite') await this.apiUtils.unFavorite(mediaItems);
    if (action.elementId === 'copyDescFromOther') await this.apiUtils.copyDescriptionFromOther(mediaItems);
  }
}
