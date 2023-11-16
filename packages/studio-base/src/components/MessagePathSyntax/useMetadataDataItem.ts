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
import { Metadata } from "@foxglove/studio";
import { useMetadataReducer } from "@foxglove/studio-base/PanelAPI";
import {
  MetadataAndData,
  useCachedGetMetadataDataItems,
} from "@foxglove/studio-base/components/MessagePathSyntax/useCachedGetMetadataDataItems";
import { subscribePayloadFromMetadataName } from "@foxglove/studio-base/players/subscribePayloadFromMetadataName";
import { SubscribeMetadataPayload } from "@foxglove/studio-base/players/types";

const log = Log.getLogger(__filename);

type Options = {
  historySize: number;
};

type ReducedValue = {
  // Matched message (events) oldest message first
  matches: MetadataAndData[];

  // The latest set of message events recevied to addMessages
  metadataList: readonly Readonly<Metadata>[];

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
export function useMetadataDataItem(path: string, options?: Options): ReducedValue["matches"] {
  const { historySize = 1 } = options ?? {};
  const metadataNames: SubscribeMetadataPayload[] = useMemo(() => {
    const payload = subscribePayloadFromMetadataName(path);
    if (payload) {
      return [payload];
    }
    return [];
  }, [path]);

  const cachedGetMetadataDataItems = useCachedGetMetadataDataItems([path]);

  const addMetadatas = useCallback(
    (prevValue: ReducedValue, metadataList: Readonly<Metadata[]>): ReducedValue => {
      if (metadataList.length === 0) {
        return prevValue;
      }

      const newMatches: MetadataAndData[] = [];

      // Iterate backwards since our default history size is 1 and we might not need to visit all messages
      // This does mean we need to flip newMatches around since we want to store older items first
      for (let i = metadataList.length - 1; i >= 0 && newMatches.length < historySize; --i) {
        const metadata = metadataList[i]!;
        log.info(metadata);
        const queriedData = [metadata]; //cachedGetMetadataDataItems(path, metadata);
        log.info(queriedData);
        if (queriedData && queriedData.length > 0) {
          newMatches.push({ metadata, queriedData });
        }
      }

      // We want older items to be first in the array. Since we iterated backwards
      // we reverse the matches.
      const reversed = newMatches.reverse();
      if (newMatches.length === historySize) {
        return {
          matches: reversed,
          metadataList,
          path,
        };
      }

      const prevMatches = prevValue.matches;
      return {
        matches: prevMatches.concat(reversed).slice(-historySize),
        metadataList,
        path,
      };
    },
    [cachedGetMetadataDataItems, historySize, path],
  );

  const restore = useCallback(
    (prevValue?: ReducedValue): ReducedValue => {
      if (!prevValue) {
        return {
          matches: [],
          metadataList: [],
          path,
        };
      }

      // re-filter the previous batch of messages
      const newMatches: MetadataAndData[] = [];
      for (const metadata of prevValue.metadataList) {
        const queriedData = cachedGetMetadataDataItems(path, metadata);
        if (queriedData && queriedData.length > 0) {
          newMatches.push({ metadata, queriedData });
        }
      }

      // Return a new message set if we have matching messages or this is a different path
      // than the path used to fetch the previous set of messages.
      if (newMatches.length > 0 || path !== prevValue.path) {
        return {
          matches: newMatches.slice(-historySize),
          metadataList: prevValue.metadataList,
          path,
        };
      }

      return prevValue;
    },
    [cachedGetMetadataDataItems, historySize, path],
  );

  const reducedValue = useMetadataReducer<ReducedValue>({
    metadataNames,
    addMetadatas,
    restore,
  });

  return reducedValue.matches;
}
