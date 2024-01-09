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

import type { NodeExpansion } from "./types";
import { NodeState } from "./types";

function isTypedArray(obj: unknown) {
  return Boolean(
    obj != undefined &&
      typeof obj === "object" &&
      ArrayBuffer.isView(obj) &&
      !(obj instanceof DataView),
  );
}

function invert(value: NodeState): NodeState {
  return value === NodeState.Expanded ? NodeState.Collapsed : NodeState.Expanded;
}

/*
 * Calculate the new expansion state after toggling the node at `path`.
 */
export function toggleExpansion(
  state: NodeExpansion,
  paths: Set<string>,
  key: string,
): NodeExpansion {
  if (state === "all" || state === "none") {
    const next = state === "all" ? NodeState.Expanded : NodeState.Collapsed;
    const nextState: NodeExpansion = {};
    for (const leaf of paths) {
      // Implicitly expand all descendants when toggling collapsed root node
      if (next === NodeState.Collapsed && leaf.endsWith(key)) {
        continue;
      }
      nextState[leaf] = leaf === key ? invert(next) : next;
    }
    return nextState;
  }

  const prev = state[key];
  const next = prev != undefined ? invert(prev) : NodeState.Collapsed;
  return {
    ...state,
    [key]: next,
  };
}

/**
 * Recursively traverses all keypaths in obj, for use in JSON tree expansion.
 */
export function generateDeepKeyPaths(obj: unknown, maxArrayLength: number): Set<string> {
  const keys = new Set<string>();
  const recurseMapKeys = (path: string[], nestedObj: unknown) => {
    if (nestedObj == undefined) {
      return;
    }

    if (typeof nestedObj !== "object" && typeof nestedObj !== "function") {
      return;
    }

    if (Array.isArray(nestedObj) && nestedObj.length > maxArrayLength) {
      return;
    }

    if (isTypedArray(nestedObj)) {
      return;
    }

    if (path.length > 0) {
      keys.add(path.join("~"));
    }

    for (const key of Object.getOwnPropertyNames(nestedObj)) {
      const newPath = [key, ...path];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const value = (nestedObj as any)[key];
      recurseMapKeys(newPath, value as object);
    }
  };
  recurseMapKeys([], obj);
  return keys;
}
