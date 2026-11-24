// Saving the generated zip in the browser (F-13 AC-027). The browser parts (an object URL and a link that is clicked) are
// a seam passed in, so tests need no DOM download. Nothing is stored or logged: the file is handed to the user and the
// object URL is released after the click.

export const PROJECT_ZIP_NAME = 'sddbuilder-project.zip';

export interface DownloadSeam {
  readonly createUrl: (blob: Blob) => string;
  readonly revokeUrl: (url: string) => void;
  readonly clickLink: (url: string, name: string) => void;
}

export const browserDownload: DownloadSeam = {
  createUrl: (blob) => URL.createObjectURL(blob),
  // Released after the click, so the browser has started the download first.
  revokeUrl: (url) => {
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
  },
  clickLink: (url, name) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
  },
};

// Saves the blob under the name. The URL is released even when the click throws.
export function saveFile(blob: Blob, name: string, seam: DownloadSeam = browserDownload): void {
  const url = seam.createUrl(blob);
  try {
    seam.clickLink(url, name);
  } finally {
    seam.revokeUrl(url);
  }
}
