/**
 * Lightweight, zero-dependency pure JavaScript ZIP file generator.
 * Implements standard PKZIP store (uncompressed) format compliant with
 * all standard archive tools (Windows Explorer, macOS Archive Utility, unzip).
 */

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
}

const CRC_TABLE = makeCrcTable();

function calculateCrc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Creates a standard ZIP Blob from an array of files.
 * @param {Array<{name: string, content: string}>} files
 * @returns {Blob}
 */
export function createZipBlob(files = []) {
  const encoder = new TextEncoder();
  const fileEntries = [];

  let offset = 0;
  const parts = [];

  for (const file of files) {
    const fileNameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content || "");
    const crc = calculateCrc32(contentBytes);
    const size = contentBytes.length;

    // Local file header (30 bytes + filename)
    const localHeader = new Uint8Array(30 + fileNameBytes.length);
    const view = new DataView(localHeader.buffer);

    view.setUint32(0, 0x04034b50, true); // signature
    view.setUint16(4, 20, true);         // version needed
    view.setUint16(6, 0, true);          // general flags
    view.setUint16(8, 0, true);          // compression (0 = store)
    view.setUint16(10, 0, true);         // mod time
    view.setUint16(12, 0, true);         // mod date
    view.setUint32(14, crc, true);       // crc32
    view.setUint32(18, size, true);      // compressed size
    view.setUint32(22, size, true);      // uncompressed size
    view.setUint16(26, fileNameBytes.length, true); // filename length
    view.setUint16(28, 0, true);         // extra field length

    localHeader.set(fileNameBytes, 30);

    parts.push(localHeader);
    parts.push(contentBytes);

    fileEntries.push({
      fileNameBytes,
      crc,
      size,
      offset,
    });

    offset += localHeader.length + contentBytes.length;
  }

  // Central directory records
  const centralDirStart = offset;
  let centralDirSize = 0;

  for (const entry of fileEntries) {
    const cdHeader = new Uint8Array(46 + entry.fileNameBytes.length);
    const view = new DataView(cdHeader.buffer);

    view.setUint32(0, 0x02014b50, true); // signature
    view.setUint16(4, 20, true);         // version made by
    view.setUint16(6, 20, true);         // version needed
    view.setUint16(8, 0, true);          // general flags
    view.setUint16(10, 0, true);        // compression (0 = store)
    view.setUint16(12, 0, true);        // mod time
    view.setUint16(14, 0, true);        // mod date
    view.setUint32(16, entry.crc, true); // crc32
    view.setUint32(20, entry.size, true);// compressed size
    view.setUint32(24, entry.size, true);// uncompressed size
    view.setUint16(28, entry.fileNameBytes.length, true); // filename length
    view.setUint16(30, 0, true);        // extra field length
    view.setUint16(32, 0, true);        // comment length
    view.setUint16(34, 0, true);        // disk start
    view.setUint16(36, 0, true);        // internal attributes
    view.setUint32(38, 0, true);        // external attributes
    view.setUint32(42, entry.offset, true); // local header offset

    cdHeader.set(entry.fileNameBytes, 46);
    parts.push(cdHeader);

    centralDirSize += cdHeader.length;
    offset += cdHeader.length;
  }

  // End of Central Directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);

  eocdView.setUint32(0, 0x06054b50, true); // signature
  eocdView.setUint16(4, 0, true);          // disk number
  eocdView.setUint16(6, 0, true);          // disk with central dir
  eocdView.setUint16(8, fileEntries.length, true); // entries on disk
  eocdView.setUint16(10, fileEntries.length, true); // total entries
  eocdView.setUint32(12, centralDirSize, true); // central dir size
  eocdView.setUint32(16, centralDirStart, true); // central dir offset
  eocdView.setUint16(20, 0, true);         // comment length

  parts.push(eocd);

  return new Blob(parts, { type: "application/zip" });
}

/**
 * Downloads files as a ZIP archive to the user's computer.
 */
export function downloadFilesAsZip(files, zipName = "project.zip") {
  const blob = createZipBlob(files);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipName.endsWith(".zip") ? zipName : `${zipName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Downloads a single file directly.
 */
export function downloadSingleFile(fileName, content) {
  const blob = new Blob([content || ""], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
