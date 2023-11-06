// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { IWritable } from "@mcap/core";
import { FileHandle } from "fs/promises";

// Mcap IWritable interface for nodejs FileHandle
export class FileHandleWritable implements IWritable {
  #handle: FileHandle;
  #totalBytesWritten = 0;

  public constructor(handle: FileHandle) {
    this.#handle = handle;
  }

  public async write(buffer: Uint8Array): Promise<void> {
    const written = await this.#handle.write(buffer);
    this.#totalBytesWritten += written.bytesWritten;
  }

  public position(): bigint {
    return BigInt(this.#totalBytesWritten);
  }
}
