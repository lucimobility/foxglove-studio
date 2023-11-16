// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2019-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { useCallback, useMemo } from "react";

import Log from "@foxglove/log";
import { Attachment } from "@foxglove/studio";
import { useAttachmentReducer } from "@foxglove/studio-base/PanelAPI";
import {
  AttachmentAndData,
  useCachedGetAttachmentDataItems,
} from "@foxglove/studio-base/components/MessagePathSyntax/useCachedGetAttachmentDataItems";
import { subscribePayloadFromAttachmentName } from "@foxglove/studio-base/players/subscribePayloadFromAttachmentName";
import { SubscribeAttachmentPayload } from "@foxglove/studio-base/players/types";

const log = Log.getLogger(__filename);

type Options = {
  historySize: number;
};

type ReducedValue = {
  // Matched message (events) oldest message first
  matches: AttachmentAndData[];

  // The latest set of message events recevied to addMessages
  attachments: readonly Readonly<Attachment>[];

  // The path used to match these messages.
  path: string;
};

/**
 * Return an array of MessageAndData[] for matching messages on @param path.
 *
 * The first array item is the oldest matched message, and the last item is the newest.
 *
 * The `historySize` option configures how many matching messages to keep. The default is 1.
 */
export function useAttachmentDataItem(path: string, options?: Options): ReducedValue["matches"] {
  log.info(path);
  const { historySize = 1 } = options ?? {};
  const attachmentNames: SubscribeAttachmentPayload[] = useMemo(() => {
    const payload = subscribePayloadFromAttachmentName(path);
    if (payload) {
      return [payload];
    }
    return [];
  }, [path]);

  log.info(attachmentNames);

  const cachedGetAttachmentDataItems = useCachedGetAttachmentDataItems([path]);

  const addAttachments = useCallback(
    (prevValue: ReducedValue, attachments: Readonly<Attachment[]>): ReducedValue => {
      if (attachments.length === 0) {
        return prevValue;
      }

      const newMatches: AttachmentAndData[] = [];

      // Iterate backwards since our default history size is 1 and we might not need to visit all messages
      // This does mean we need to flip newMatches around since we want to store older items first
      for (let i = attachments.length - 1; i >= 0 && newMatches.length < historySize; --i) {
        const attachment = attachments[i]!;
        const queriedData = [attachment]; //cachedGetAttachmentDataItems(path, attachment);
        if (queriedData && queriedData.length > 0) {
          newMatches.push({ attachment, queriedData });
        }
      }

      // We want older items to be first in the array. Since we iterated backwards
      // we reverse the matches.
      const reversed = newMatches.reverse();
      if (newMatches.length === historySize) {
        return {
          matches: reversed,
          attachments,
          path,
        };
      }

      const prevMatches = prevValue.matches;
      return {
        matches: prevMatches.concat(reversed).slice(-historySize),
        attachments,
        path,
      };
    },
    [historySize, path],
  );

  const restore = useCallback(
    (prevValue?: ReducedValue): ReducedValue => {
      if (!prevValue) {
        return {
          matches: [],
          attachments: [],
          path,
        };
      }

      // re-filter the previous batch of messages
      const newMatches: AttachmentAndData[] = [];
      for (const attachment of prevValue.attachments) {
        const queriedData = cachedGetAttachmentDataItems(path, attachment);
        if (queriedData && queriedData.length > 0) {
          newMatches.push({ attachment, queriedData });
        }
      }

      // Return a new message set if we have matching messages or this is a different path
      // than the path used to fetch the previous set of messages.
      if (newMatches.length > 0 || path !== prevValue.path) {
        return {
          matches: newMatches.slice(-historySize),
          attachments: prevValue.attachments,
          path,
        };
      }

      return prevValue;
    },
    [cachedGetAttachmentDataItems, historySize, path],
  );

  const reducedValue = useAttachmentReducer<ReducedValue>({
    attachmentNames,
    addAttachments,
    restore,
  });

  return reducedValue.matches;
}
