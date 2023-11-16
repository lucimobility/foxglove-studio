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
import { Attachment } from "@foxglove/studio";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import useShouldNotChangeOften from "@foxglove/studio-base/hooks/useShouldNotChangeOften";
import {
  PlayerStateActiveData,
  SubscribeAttachmentPayload,
  SubscriptionPreloadType,
} from "@foxglove/studio-base/players/types";

const log = Log.getLogger(__filename);

type AttachmentReducer<T> = (arg0: T, attachment: Attachment) => T;
type AttachmentsReducer<T> = (arg0: T, attachments: readonly Attachment[]) => T;

type Params<T> = {
  attachmentNames: readonly string[] | SubscribeAttachmentPayload[];
  preloadType?: SubscriptionPreloadType;

  // Functions called when the reducers change and for each newly received message.
  // The object is assumed to be immutable, so in order to trigger a re-render, the reducers must
  // return a new object.
  restore: (arg: T | undefined) => T;
  addAttachment?: AttachmentReducer<T>;
  addAttachments?: AttachmentsReducer<T>;
};

function selectSetAttachmentSubscriptions(ctx: MessagePipelineContext) {
  return ctx.setAttachmentSubscriptions;
}

export function useAttachmentReducer<T>(props: Params<T>): T {
  const [id] = useState(() => uuidv4());
  const { restore, addAttachment, addAttachments, preloadType = "partial" } = props;

  // only one of the add message callbacks should be provided
  if ([props.addAttachment, props.addAttachments].filter(Boolean).length !== 1) {
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
  useShouldNotChangeOften(props.addAttachment, () => {
    log.warn(
      "useMessageReducer addMessage() is changing frequently. " +
        "addMessage() will be called each time it changes, so a new function " +
        "shouldn't be created on each render. (If you're using Hooks, try useCallback.)",
    );
  });
  useShouldNotChangeOften(props.addAttachments, () => {
    log.warn(
      "useMessageReducer addMessages() is changing frequently. " +
        "addMessages() will be called each time it changes, so a new function " +
        "shouldn't be created on each render. (If you're using Hooks, try useCallback.)",
    );
  });

  const requestedAttachmentNames = useShallowMemo(props.attachmentNames);
  log.info("requested attachment names: ", requestedAttachmentNames);

  const subscriptions = useMemo<SubscribeAttachmentPayload[]>(() => {
    log.info("requested attachment names: ", requestedAttachmentNames);
    return requestedAttachmentNames.map((name) => {
      if (typeof name === "string") {
        return { name, preloadType };
      } else {
        return name;
      }
    });
  }, [preloadType, requestedAttachmentNames]);

  const setSubscriptions = useMessagePipeline(selectSetAttachmentSubscriptions);
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
        attachments: PlayerStateActiveData["attachments"] | undefined;
        lastSeekTime: number | undefined;
        reducedValue: T;
        restore: typeof restore;
        addAttachment: typeof addAttachment;
        addAttachments: typeof addAttachments;
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
        const attachments = ctx.attachmentsBySubscriberId.get(id);
        const lastSeekTime = ctx.playerState.activeData?.lastSeekTime;

        let newReducedValue: T;
        if (!state.current || lastSeekTime !== state.current.lastSeekTime) {
          newReducedValue = restore(undefined);
        } else if (
          restore !== state.current.restore ||
          addAttachment !== state.current.addAttachment ||
          addAttachments !== state.current.addAttachments
        ) {
          newReducedValue = restore(state.current.reducedValue);
        } else {
          newReducedValue = state.current.reducedValue;
        }

        if (attachments && attachments.length > 0 && attachments !== state.current?.attachments) {
          if (addAttachments) {
            if (attachments.length > 0) {
              newReducedValue = addAttachments(newReducedValue, attachments);
            }
          } else if (addAttachment) {
            for (const attachment of attachments) {
              newReducedValue = addAttachment(newReducedValue, attachment);
            }
          }
        }

        state.current = {
          attachments,
          lastSeekTime,
          reducedValue: newReducedValue,
          restore,
          addAttachment,
          addAttachments,
        };

        return state.current.reducedValue;
      },
      [id, addAttachment, addAttachments, restore],
    ),
  );
}
