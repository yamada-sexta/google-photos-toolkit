export type FormValue = FormDataEntryValue | FormDataEntryValue[];

export type FormObject = Record<string, FormValue>;

export default function getForm(selector: string): FormObject {
  const form: FormObject = {};
  const formElement = document.querySelector<HTMLFormElement>(selector);

  if (!formElement) {
    alert(`Form element not found for selector: ${selector}`);
    throw new Error(`Form element not found for selector: ${selector}`);
  }

  const formData = new FormData(formElement);

  for (const [key, value] of formData.entries()) {
    if (!value) continue;

    if (Reflect.has(form, key)) {
      const existing = form[key] as FormDataEntryValue | FormDataEntryValue[];

      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        form[key] = [existing, value];
      }
    } else {
      form[key] = value;
    }
  }

  return form;
}