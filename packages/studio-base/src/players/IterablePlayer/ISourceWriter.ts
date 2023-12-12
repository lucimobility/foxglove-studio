// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Attachment, Immutable, Metadata } from "@foxglove/studio";

/**
 * ISourceWriter specifies an interface for initializing and writing attachments
 * and metadata to existing MCAP files.
 */
export interface ISourceWriter {
  /**
   * Initialize the source.
   */
  initialize(): Promise<void>;

  /**
   * Write attachments to MCAP file.
   */
  writeAttachments(attachments: Immutable<Attachment[]>): Promise<void>;

  /**
   * Write metadata to MCAP file.
   */
  writeMetadata(metadata: Immutable<Metadata[]>): Promise<void>;

  /**
   * Terminate the source writer.
   */
  terminateWriter: () => Promise<void>;
}

export type SourceWriterInitializeArgs = {
  file?: File;
  handle?: FileSystemFileHandle;
};
