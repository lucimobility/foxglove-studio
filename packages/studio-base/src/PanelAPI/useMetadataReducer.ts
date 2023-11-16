// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { useShallowMemo } from "@foxglove/hooks";
import Log from "@foxglove/log";
import { Metadata } from "@foxglove/studio";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import useShouldNotChangeOften from "@foxglove/studio-base/hooks/useShouldNotChangeOften";
import {
  PlayerStateActiveData,
  SubscribeMetadataPayload,
} from "@foxglove/studio-base/players/types";

const log = Log.getLogger(__filename);

type MetadataReducer<T> = (arg0: T, metadata: Metadata) => T;
type MetadatasReducer<T> = (arg0: T, metadatas: readonly Metadata[]) => T;

type Params<T> = {
  metadataNames: readonly string[] | SubscribeMetadataPayload[];

  // Functions called when the reducers change and for each newly received message.
  // The object is assumed to be immutable, so in order to trigger a re-render, the reducers must
  // return a new object.
  restore: (arg: T | undefined) => T;
  addMetadata?: MetadataReducer<T>;
  addMetadatas?: MetadatasReducer<T>;
};

function selectSetMetadataSubscriptions(ctx: MessagePipelineContext) {
  return ctx.setMetadataSubscriptions;
}

export function useMetadataReducer<T>(props: Params<T>): T {
  const [id] = useState(() => uuidv4());
  const { restore, addMetadata, addMetadatas } = props;

  // only one of the add message callbacks should be provided
  if ([props.addMetadata, props.addMetadatas].filter(Boolean).length !== 1) {
    throw new Error(
      "useMessageReducer must be provided with exactly one of addMessage or addMessages",
    );
  }

  useShouldNotChangeOften(props.restore, () => {
    log.warn(
      "useMessageReducer restore() is changing frequently. " +
        "restore() will be called each time it changes, so a new function " +
        "shouldn't be created on each render. (If you're using Hooks, try useCallback.)",
    );
  });
  useShouldNotChangeOften(props.addMetadata, () => {
    log.warn(
      "useMessageReducer addMessage() is changing frequently. " +
        "addMessage() will be called each time it changes, so a new function " +
        "shouldn't be created on each render. (If you're using Hooks, try useCallback.)",
    );
  });
  useShouldNotChangeOften(props.addMetadatas, () => {
    log.warn(
      "useMessageReducer addMessages() is changing frequently. " +
        "addMessages() will be called each time it changes, so a new function " +
        "shouldn't be created on each render. (If you're using Hooks, try useCallback.)",
    );
  });

  const requestedMetadataNames = useShallowMemo(props.metadataNames);
  log.info("requested metadata names: ", requestedMetadataNames);

  const subscriptions = useMemo<SubscribeMetadataPayload[]>(() => {
    log.info("requested metadata names: ", requestedMetadataNames);
    return requestedMetadataNames.map((name) => {
      if (typeof name === "string") {
        return { name };
      } else {
        return name;
      }
    });
  }, [requestedMetadataNames]);

  const setSubscriptions = useMessagePipeline(selectSetMetadataSubscriptions);
  useEffect(() => {
    setSubscriptions(id, subscriptions);
  }, [id, setSubscriptions, subscriptions]);
  useEffect(() => {
    return () => {
      setSubscriptions(id, []);
    };
  }, [id, setSubscriptions]);

  const state = useRef<
    | Readonly<{
        metadatas: PlayerStateActiveData["metadata"] | undefined;
        lastSeekTime: number | undefined;
        reducedValue: T;
        restore: typeof restore;
        addMetadata: typeof addMetadata;
        addMetadatas: typeof addMetadatas;
      }>
    | undefined
  >();

  return useMessagePipeline(
    useCallback(
      // To compute the reduced value from new messages:
      // - Call restore() to initialize state, if lastSeekTime has changed, or if reducers have changed
      // - Call addMessage() or addMessages() if any new messages of interest have arrived
      // - Otherwise, return the previous reducedValue so that we don't trigger an unnecessary render.
      function selectReducedMessages(ctx: MessagePipelineContext): T {
        log.info(ctx.metadataBySubscriberId);
        const metadatas = ctx.metadataBySubscriberId.get(id);
        const lastSeekTime = ctx.playerState.activeData?.lastSeekTime;

        log.info(metadatas);

        let newReducedValue: T;
        if (!state.current) {
          newReducedValue = restore(undefined);
        } else if (
          restore !== state.current.restore ||
          addMetadata !== state.current.addMetadata ||
          addMetadatas !== state.current.addMetadatas
        ) {
          newReducedValue = restore(state.current.reducedValue);
        } else {
          newReducedValue = state.current.reducedValue;
        }

        if (metadatas && metadatas.length > 0) {
          if (addMetadatas) {
            if (metadatas.length > 0) {
              newReducedValue = addMetadatas(newReducedValue, metadatas);
            }
          } else if (addMetadata) {
            for (const metadata of metadatas) {
              newReducedValue = addMetadata(newReducedValue, metadata);
            }
          }
        }

        log.info(state.current);

        state.current = {
          metadatas,
          lastSeekTime,
          reducedValue: newReducedValue,
          restore,
          addMetadata,
          addMetadatas,
        };

        return state.current.reducedValue;
      },
      [id, addMetadata, addMetadatas, restore],
    ),
  );
}
