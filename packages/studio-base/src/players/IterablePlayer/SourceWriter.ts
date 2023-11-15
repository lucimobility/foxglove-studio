// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Attachment, Immutable, Metadata } from "@foxglove/studio";
import { PlayerProblem } from "@foxglove/studio-base/players/types";

export type Initialization = {
  /** Publisher names by topic **/
  publishersByTopic: Map<string, Set<string>>;

  problems: PlayerProblem[];
};

/**
 * IIterableSource specifies an interface for initializing and accessing messages using iterators.
 *
 * IIterableSources also provide a backfill method to obtain the last message available for topics.
 */
export interface SourceWriter {
  /**
   * Initialize the source.
   */
  initialize(): Promise<void>;

  writeAttachments(attachments: Immutable<Attachment[]>): Promise<void>;

  writeMetadata(metadata: Immutable<Metadata[]>): Promise<void>;

  /**
   * Optional method a data source can implement to cleanup resources. The player will call this
   * method when the source will no longer be used.
   */
  terminate?: () => Promise<void>;
}

export type SourceWriterInitializeArgs = {
  file?: File;
  handle?: FileSystemFileHandle;
  writable?: FileSystemWritableFileStream;
  url?: string;
  files?: File[];
  params?: Record<string, string | undefined>;

  api?: {
    baseUrl: string;
    auth?: string;
  };
};
