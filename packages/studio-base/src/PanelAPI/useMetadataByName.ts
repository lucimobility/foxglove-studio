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

import * as _ from "lodash-es";
import { useCallback } from "react";

import { useDeepMemo } from "@foxglove/hooks";
import { Metadata } from "@foxglove/studio";
import { useMetadataReducer } from "@foxglove/studio-base/PanelAPI/useMetadataReducer";
import { SubscribeMetadataPayload } from "@foxglove/studio-base/players/types";
import concatAndTruncate from "@foxglove/studio-base/util/concatAndTruncate";

// Topic types that are not known at compile time
type UnknownMetadataByName = Record<string, readonly Metadata[]>;

/**
 * useMessagesByTopic makes it easy to request some messages on some topics.
 *
 * Using this hook will cause the panel to re-render when new messages arrive on the requested topics.
 * - During file playback the panel will re-render when the file is playing or when the user is scrubbing.
 * - During live playback the panel will re-render when new messages arrive.
 */
export function useMetadataByName(params: {
  metadataSubscriptions: readonly string[] | SubscribeMetadataPayload[];
  historySize: number;
}): Record<string, readonly Metadata[]> {
  const { historySize, metadataSubscriptions } = params;
  const requestedMetadata = useDeepMemo(metadataSubscriptions);

  const addMetadata = useCallback(
    (prevMetadataByName: UnknownMetadataByName, metadataList: readonly Metadata[]) => {
      const newMetadataByName = _.groupBy(metadataList, "name");
      const ret: UnknownMetadataByName = { ...prevMetadataByName };
      Object.entries(newMetadataByName).forEach(([name, newMetadata]) => {
        const retName = ret[name];
        if (retName) {
          ret[name] = concatAndTruncate(retName, newMetadata, historySize);
        }
      });
      return ret;
    },
    [historySize],
  );

  const restore = useCallback(
    (prevMetadataByName?: UnknownMetadataByName) => {
      const newMetadataByName: UnknownMetadataByName = {};
      // When changing topics, we try to keep as many messages around from the previous set of
      // topics as possible.
      for (const metadata of requestedMetadata) {
        const metadataName = typeof metadata === "string" ? metadata : metadata.name;
        const prevMetadata = prevMetadataByName?.[metadataName];
        newMetadataByName[metadataName] = prevMetadata?.slice(-historySize) ?? [];
      }
      return newMetadataByName;
    },
    [requestedMetadata, historySize],
  );

  return useMetadataReducer({
    metadataNames: requestedMetadata,
    restore,
    addMetadata,
  });
}
