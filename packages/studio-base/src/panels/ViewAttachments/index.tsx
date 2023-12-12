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

import * as _ from "lodash-es";
import { useCallback, useEffect, useMemo, useState } from "react";
import Tree from "react-json-tree";
import * as toml from "toml";
import { makeStyles } from "tss-react/mui";

import Log from "@foxglove/log";
import { Immutable, SettingsTreeAction } from "@foxglove/studio";
import { useDataSourceInfo } from "@foxglove/studio-base/PanelAPI";
import EmptyState from "@foxglove/studio-base/components/EmptyState";
import useGetItemStringWithTimezone from "@foxglove/studio-base/components/JsonTree/useGetItemStringWithTimezone";
import { useAttachmentDataItem } from "@foxglove/studio-base/components/MessagePathSyntax/useAttachmentDataItem";
import Panel from "@foxglove/studio-base/components/Panel";
import { usePanelContext } from "@foxglove/studio-base/components/PanelContext";
import Stack from "@foxglove/studio-base/components/Stack";
import { Toolbar } from "@foxglove/studio-base/panels/ViewAttachments/Toolbar";
import { usePanelSettingsTreeUpdate } from "@foxglove/studio-base/providers/PanelStateContextProvider";
import { SaveConfig } from "@foxglove/studio-base/types/panels";
import { useJsonTreeTheme } from "@foxglove/studio-base/util/globalConstants";

import { DiffSpan } from "./DiffSpan";
import { Constants, NodeState, ViewAttachmentsPanelConfig } from "./types";
import { generateDeepKeyPaths, toggleExpansion } from "./utils";

const log = Log.getLogger(__filename);

type Props = {
  config: Immutable<ViewAttachmentsPanelConfig>;
  saveConfig: SaveConfig<ViewAttachmentsPanelConfig>;
};

const useStyles = makeStyles()((theme) => ({
  topic: {
    fontFamily: theme.typography.body1.fontFamily,
    fontFeatureSettings: `${theme.typography.fontFeatureSettings}, "zero"`,
  },
}));

const diffLabels = {
  ADDED: {
    labelText: "STUDIO_DIFF___ADDED",
    color: "#404047",
    backgroundColor: "#daffe7",
    invertedBackgroundColor: "#182924",
    indicator: "+",
  },
  DELETED: {
    labelText: "STUDIO_DIFF___DELETED",
    color: "#404047",
    backgroundColor: "#ffdee3",
    invertedBackgroundColor: "#3d2327",
    indicator: "-",
  },
  CHANGED: {
    labelText: "STUDIO_DIFF___CHANGED",
    color: "#eba800",
  },
  ID: { labelText: "STUDIO_DIFF___ID" },
};

function ViewAttachments(props: Props) {
  const { classes } = useStyles();
  const jsonTreeTheme = useJsonTreeTheme();
  const { config, saveConfig } = props;
  const { attachmentName, fontSize } = config;
  const { attachmentNames } = useDataSourceInfo();

  const updatePanelSettingsTree = usePanelSettingsTreeUpdate();
  const { setMessagePathDropConfig } = usePanelContext();

  useEffect(() => {
    setMessagePathDropConfig({
      getDropStatus(paths) {
        if (paths.length !== 1) {
          return { canDrop: false };
        }
        return { canDrop: true, effect: "replace" };
      },
      handleDrop(paths) {
        const path = paths[0];
        if (path) {
          saveConfig({ attachmentName: path.path });
        }
      },
    });
  }, [setMessagePathDropConfig, saveConfig]);

  const getItemString = useGetItemStringWithTimezone();

  const topic: string | undefined = useMemo(
    () => attachmentName && attachmentNames.find((name) => name === attachmentName),
    [attachmentName, attachmentNames],
  );

  const [expansion, setExpansion] = useState(config.expansion);

  // Pass an empty path to useAttachmentDataItem if our path doesn't resolve to a valid topic to avoid
  // spamming the message pipeline with useless subscription requests.
  const matchedMessages = useAttachmentDataItem(topic ? attachmentName : "", { historySize: 2 });

  log.info("matchedMessages: {}", matchedMessages);

  const baseItem = matchedMessages[matchedMessages.length - 1];

  const nodes = useMemo(() => {
    if (baseItem) {
      return generateDeepKeyPaths(baseItem, 5);
    } else {
      return new Set<string>();
    }
  }, [baseItem]);

  const canExpandAll = useMemo(() => {
    if (expansion === "none") {
      return true;
    }
    if (expansion === "all") {
      return false;
    }
    if (
      typeof expansion === "object" &&
      Object.values(expansion).some((v) => v === NodeState.Collapsed)
    ) {
      return true;
    } else {
      return false;
    }
  }, [expansion]);

  const onTopicPathChange = useCallback(
    (newTopicPath: string) => {
      setExpansion(undefined);
      saveConfig({ attachmentName: newTopicPath });
    },
    [saveConfig],
  );

  const onToggleExpandAll = useCallback(() => {
    setExpansion(canExpandAll ? "all" : "none");
  }, [canExpandAll]);

  const onLabelClick = useCallback(
    (keypath: (string | number)[]) => {
      setExpansion((old) => toggleExpansion(old ?? "all", nodes, keypath.join("~")));
    },
    [nodes],
  );

  useEffect(() => {
    saveConfig({ expansion });
  }, [expansion, saveConfig]);

  const renderSingleTopicOrDiffOutput = useCallback(() => {
    const shouldExpandNode = (keypath: (string | number)[]) => {
      if (expansion === "all") {
        return true;
      }
      if (expansion === "none") {
        return false;
      }

      const joinedPath = keypath.join("~");
      if (expansion && expansion[joinedPath] === NodeState.Collapsed) {
        return false;
      }
      if (expansion && expansion[joinedPath] === NodeState.Expanded) {
        return true;
      }

      return true;
    };

    if (attachmentName.length === 0) {
      return <EmptyState>No Attachment selected</EmptyState>;
    }

    if (!baseItem) {
      return <EmptyState>Waiting for attachment</EmptyState>;
    }

    const displayData = {
      name: baseItem.name,
      mediaType: baseItem.mediaType,
      createTime: baseItem.createTime,
      logTime: baseItem.logTime,
      data: baseItem.data
    };

    if (baseItem.mediaType === "application/toml") {
      displayData.data = toml.parse(new TextDecoder().decode(baseItem.data));
    }
    else if (baseItem.mediaType === "application/json") {
      displayData.data = JSON.parse(new TextDecoder().decode(baseItem.data));
    }

    return (
      <Stack
        className={classes.topic}
        flex="auto"
        overflowX="hidden"
        paddingLeft={0.75}
        data-testid="panel-scroll-container"
      >
        <Tree
          labelRenderer={(raw) => (
            <>
              <DiffSpan>{_.first(raw)}</DiffSpan>
              {/* https://stackoverflow.com/questions/62319014/make-text-selection-treat-adjacent-elements-as-separate-words */}
              <span style={{ fontSize: 0 }}>&nbsp;</span>
            </>
          )}
          shouldExpandNode={shouldExpandNode}
          onExpand={(_data, _level, keyPath) => {
            onLabelClick(keyPath);
          }}
          onCollapse={(_data, _level, keyPath) => {
            onLabelClick(keyPath);
          }}
          hideRoot
          invertTheme={false}
          getItemString={getItemString}
          postprocessValue={(rawVal: unknown) => {
            if (rawVal == undefined) {
              return rawVal;
            }
            const idValue = (rawVal as Record<string, unknown>)[diffLabels.ID.labelText];
            const addedValue = (rawVal as Record<string, unknown>)[diffLabels.ADDED.labelText];
            const changedValue = (rawVal as Record<string, unknown>)[
              diffLabels.CHANGED.labelText
            ];
            const deletedValue = (rawVal as Record<string, unknown>)[
              diffLabels.DELETED.labelText
            ];
            if (
              (addedValue != undefined ? 1 : 0) +
              (changedValue != undefined ? 1 : 0) +
              (deletedValue != undefined ? 1 : 0) ===
              1 &&
              idValue == undefined
            ) {
              return addedValue ?? changedValue ?? deletedValue;
            }
            return rawVal;
          }}
          theme={{
            ...jsonTreeTheme,
            tree: { margin: 0 },

            nestedNode: ({ style }) => {
              const baseStyle = {
                ...style,
                fontSize,
                paddingTop: 2,
                paddingBottom: 2,
                marginTop: 2,
                textDecoration: "inherit",
              };
              return { style: baseStyle };
            },
            nestedNodeLabel: ({ style }) => ({
              style: { ...style, textDecoration: "inherit" },
            }),
            nestedNodeChildren: ({ style }) => ({
              style: { ...style, textDecoration: "inherit" },
            }),

            value: ({ style }, _nodeType) => {
              const baseStyle = {
                ...style,
                fontSize,
                textDecoration: "inherit",
              };
              return { style: baseStyle };
            },
            label: { textDecoration: "inherit" },
          }}
          data={displayData}
        />
      </Stack>
    );
  }, [attachmentName, baseItem, classes.topic, fontSize, getItemString, jsonTreeTheme, expansion, onLabelClick]);

  const actionHandler = useCallback(
    (action: SettingsTreeAction) => {
      if (action.action === "update") {
        if (action.payload.path[0] === "general") {
          if (action.payload.path[1] === "fontSize") {
            saveConfig({
              fontSize:
                action.payload.value != undefined ? (action.payload.value as number) : undefined,
            });
          }
        }
      }
    },
    [saveConfig],
  );

  useEffect(() => {
    updatePanelSettingsTree({
      actionHandler,
      nodes: {
        general: {
          label: "General",
          fields: {
            fontSize: {
              label: "Font size",
              input: "select",
              options: [
                { label: "auto", value: undefined },
                ...Constants.FONT_SIZE_OPTIONS.map((value) => ({
                  label: `${value} px`,
                  value,
                })),
              ],
              value: fontSize,
            },
          },
        },
      },
    });
  }, [actionHandler, fontSize, updatePanelSettingsTree]);

  return (
    <Stack flex="auto" overflow="hidden" position="relative">
      <Toolbar
        canExpandAll={canExpandAll}
        onToggleExpandAll={onToggleExpandAll}
        onTopicPathChange={onTopicPathChange}
        attachmentName={attachmentName}
      />
      {renderSingleTopicOrDiffOutput()}
    </Stack>
  );
}

const defaultConfig: ViewAttachmentsPanelConfig = {
  attachmentName: "",
  fontSize: undefined,
};

export default Panel(
  Object.assign(ViewAttachments, {
    panelType: "ViewAttachments",
    defaultConfig,
  }),
);
