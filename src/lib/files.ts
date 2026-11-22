/** Saves text as a file in the browser's downloads, as a download link would. */
export function saveFile(name: string, text: string, type = 'text/html') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  link.click();
  // The download has started by now, but give the browser a moment before letting go of the data.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Asks for a bookmarks file and reads it. Null if the person cancels. */
export function pickFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.html,.htm,text/html' });
    input.addEventListener('change', () => void (input.files?.[0]?.text() ?? Promise.resolve(null)).then(resolve));
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}
