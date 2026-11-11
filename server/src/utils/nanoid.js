import crypto from "crypto";

// Minimal dependency-free stand-in for nanoid's customAlphabet, so we don't
// need to pull in an extra package just for generating short room IDs.
export function customAlphabet(alphabet, defaultSize = 10) {
  return function generate(size = defaultSize) {
    const bytes = crypto.randomBytes(size);
    let id = "";
    for (let i = 0; i < size; i++) {
      id += alphabet[bytes[i] % alphabet.length];
    }
    return id;
  };
}
