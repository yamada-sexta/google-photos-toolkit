export default function splitArrayIntoChunks<T>(arr: T[], chunkSize: number | string = 500): T[][] {
  const size = Math.max(1, parseInt(String(chunkSize), 10));
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
