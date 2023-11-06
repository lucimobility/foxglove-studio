// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Time } from "@foxglove/rostime";
import { Attachment, MessageEvent, Metadata } from "@foxglove/studio";
import {
  PlayerProblem,
  Topic,
  TopicSelection,
  TopicStats,
} from "@foxglove/studio-base/players/types";
import { RosDatatypes } from "@foxglove/studio-base/types/RosDatatypes";

export type Initalization = {
  start: Time;
  end: Time;
  topics: Topic[];
  attachmentNames: string[];
  topicStats: Map<string, TopicStats>;
  datatypes: RosDatatypes;
  profile: string | undefined;
  name?: string;

  /** Publisher names by topic **/
  publishersByTopic: Map<string, Set<string>>;

  problems: PlayerProblem[];
};

export type MessageIteratorArgs = {
  /** Which topics to return from the iterator */
  topics: TopicSelection;

  /**
   * The start time of the iterator (inclusive). If no start time is specified, the iterator will start
   * from the beginning of the source.
   *
   * The first message receiveTime will be >= start.
   * */
  start?: Time;

  /**
   * The end time of the iterator (inclusive). If no end time is specified, the iterator will stop
   * at the end of the source.
   *
   * The last message receiveTime will be <= end.
   * */
  end?: Time;

  /**
   * Indicate the expected way the iterator is consumed.
   *
   * Data sources may choose to change internal mechanics depending on whether the messages are
   * consumed immediate in full from the iterator or if it might be read partially.
   *
   * `full` indicates that the caller plans to read the entire iterator
   * `partial` indicates that the caller plans to read the iterator but may not read all the messages
   */
  consumptionType?: "full" | "partial";
};

/**
 * IteratorResult represents a single result from a message iterator or cursor. There are three
 * types of results.
 *
 * - message-event: the result contains a MessageEvent
 * - problem: the result contains a problem
 * - stamp: the result is a timestamp
 *
 * Note: A stamp result acts as a marker indicating that the source has reached the specified stamp.
 * The source may return stamp results to indicate to callers that it has read through some time
 * when there are no message events available to indicate the time is reached.
 */
export type IteratorResult =
  | {
      type: "message-event";
      connectionId?: number;
      msgEvent: MessageEvent;
    }
  | {
      type: "problem";
      connectionId?: number;
      problem: PlayerProblem;
    }
  | {
      type: "stamp";
      stamp: Time;
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
  initialize(): Promise<Initalization>;

  /**
   * Instantiate an IMessageIterator for the source.
   *
   * The iterator produces IteratorResults from the source. The IteratorResults should be in log
   * time order.
   *
   * Returning an AsyncIterator rather than AsyncIterable communicates that the returned iterator
   * cannot be used directly in a `for-await-of` loop. This forces the IterablePlayer implementation
   * to use the `.next()` API, rather than `for-await-of` which would implicitly call the iterator's
   * `return()` method when breaking out of the loop and prevent the iterator from being used in
   * more than one loop. This means the IIterableSource implementations can use a simple async
   * generator function, and a `finally` block to do any necessary cleanup tasks when the request
   * finishes or is canceled.
   */
  // messageIterator(
  //   args: Immutable<MessageIteratorArgs>,
  // ): AsyncIterableIterator<Readonly<IteratorResult>>;

  writeAttachments(attachments: Attachment[]): void;

  writeMetadata(metadata: Metadata[]): void;

  /**
   * Optional method a data source can implement to cleanup resources. The player will call this
   * method when the source will no longer be used.
   */
  terminate?: () => Promise<void>;
}

export type IterableSourceInitializeArgs = {
  file?: File;
  url?: string;
  files?: File[];
  params?: Record<string, string | undefined>;

  api?: {
    baseUrl: string;
    auth?: string;
  };
};
