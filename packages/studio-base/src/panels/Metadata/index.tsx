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

import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import {
  Button,
  ButtonGroup,
  FormControl,
  FormLabel,
  IconButton,
  inputBaseClasses,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from "@mui/material";
import * as _ from "lodash-es";
import { useCallback, useEffect, useMemo, useState } from "react";
import { keyframes } from "tss-react";
import { makeStyles } from "tss-react/mui";
import { useImmer } from "use-immer";

import Log from "@foxglove/log";
import { toDate, toNanoSec } from "@foxglove/rostime";
import { Metadata } from "@foxglove/studio";
import { useDataSourceInfo } from "@foxglove/studio-base/PanelAPI";
import { MessagePipelineContext, useMessagePipeline } from "@foxglove/studio-base/components/MessagePipeline";
import Panel from "@foxglove/studio-base/components/Panel";
import PanelToolbar from "@foxglove/studio-base/components/PanelToolbar";
import Stack from "@foxglove/studio-base/components/Stack";
import { useAppTimeFormat } from "@foxglove/studio-base/hooks";
import useCallbackWithToast from "@foxglove/studio-base/hooks/useCallbackWithToast";
import useWriteMetadata from "@foxglove/studio-base/hooks/useWriteMetadata";
import { PlayerCapabilities } from "@foxglove/studio-base/players/types";
import { useDefaultPanelTitle } from "@foxglove/studio-base/providers/PanelStateContextProvider";
import { SaveConfig } from "@foxglove/studio-base/types/panels";

import { defaultConfig, useMetadataPanelSettings } from "./settings";
import { MetadataConfig } from "./types";

const log = Log.getLogger(__filename);

type KeyValue = { key: string; value: string };

type Props = {
  config: MetadataConfig;
  saveConfig: SaveConfig<MetadataConfig>;
};

const fadeInAnimation = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const useStyles = makeStyles<{ buttonColor?: string }, "toggleButton">()((theme, { buttonColor }, classes) => {
  const augmentedButtonColor = (buttonColor)
    ? theme.palette.augmentColor({
      color: { main: buttonColor },
    })
    : undefined;

  return {
    button: {
      backgroundColor: augmentedButtonColor?.main,
      color: augmentedButtonColor?.contrastText,

      "&:hover": {
        backgroundColor: augmentedButtonColor?.dark,
      },
    },
    textarea: {
      height: "100%",

      [`.${inputBaseClasses.root}`]: {
        width: "100%",
        height: "100%",
        textAlign: "left",
        backgroundColor: theme.palette.background.paper,
        overflow: "hidden",
        padding: theme.spacing(1, 0.5),

        [`.${inputBaseClasses.input}`]: {
          height: "100% !important",
          lineHeight: 1.4,
          fontFamily: theme.typography.fontMonospace,
          overflow: "auto !important",
          resize: "none",
        },
      },
    },
    grid: {
      alignItems: "center",
      display: "grid",
      gridTemplateColumns: "1fr 1fr auto",
      gap: theme.spacing(1),
      overflow: "auto",
      alignContent: "flex-start",
    },
    row: {
      animation: `${fadeInAnimation} 0.2s ease-in-out`,
      display: "contents",
    },
    toggleButton: {
      border: "none",
      lineHeight: 1,
    },
    toggleButtonGroup: {
      marginRight: theme.spacing(-0.5),
      gap: theme.spacing(0.25),

      [`.${classes.toggleButton}`]: {
        borderRadius: `${theme.shape.borderRadius}px !important`,
        marginLeft: "0px !important",
        borderLeft: "none !important",
      },
    },
  };
});

const selectCurrentTime = (ctx: MessagePipelineContext) => ctx.playerState.activeData?.currentTime;

function WriteMetadata(props: Props) {
  const { saveConfig, config } = props;
  const { capabilities } = useDataSourceInfo();
  const { classes } = useStyles({ buttonColor: config.buttonColor });

  const currentTime = useMessagePipeline(selectCurrentTime);

  const [metadata, setMetadata] = useImmer<{
    startTime: undefined | Date;
    duration: undefined | number;
    durationUnit: "sec" | "nsec";
    entries: KeyValue[];
  }>({
    startTime: currentTime ? toDate(currentTime) : undefined,
    duration: 0,
    durationUnit: "sec",
    entries: [{ key: "", value: "" }],
  });

  const { formatTime } = useAppTimeFormat();

  const countedMetadata = _.countBy(metadata.entries, (kv) => kv.key);

  const [metadataName, setMetadataName] = useState<string>("");

  const updateMetadata = useCallback(
    (index: number, updateType: keyof KeyValue, value: string) => {
      setMetadata((draft) => {
        const keyval = draft.entries[index];
        if (keyval) {
          keyval[updateType] = value;

          // Automatically add new row if we're at the end and have both key and value.
          if (
            index === draft.entries.length - 1 &&
            keyval.key.length > 0 &&
            keyval.value.length > 0
          ) {
            draft.entries.push({ key: "", value: "" });
          }
        }
      });
    },
    [setMetadata],
  );

  const writeMetadata = useWriteMetadata();

  const nameError = useMemo(() => {
    let errorWithName = undefined;
    if (metadataName === "") {
      errorWithName = "Name must have a value";
    }
    return errorWithName;
  }, [metadataName]);

  useMetadataPanelSettings(config, saveConfig, ["application/json"]);

  const onAddMetadataClicked = useCallbackWithToast(() => {
    log.info(metadata);
    log.info(currentTime);
    const metadataMap = new Map<string, string>();
    metadataMap.set("startTime", toNanoSec(currentTime).toString());
    metadataMap.set("duration", metadata.duration?.toLocaleString());
    metadataMap.set("durationUnit", metadata.durationUnit);
    metadata.entries.forEach(entry => { metadataMap.set(entry.key, entry.value); });
    const metadataEntry: Metadata = { name: metadataName, metadata: metadataMap };
    log.info("writing metadata from metadata panel: ", metadataEntry);

    writeMetadata([metadataEntry]);

  }, [currentTime, metadata, metadataName, writeMetadata]);

  const [, setDefaultPanelTitle] = useDefaultPanelTitle();

  useEffect(() => {
    setDefaultPanelTitle("Write Metadata");
  }, [setDefaultPanelTitle]);

  const canWriteMetadata = Boolean(
    capabilities.includes(PlayerCapabilities.append) &&
    config.value &&
    metadataName
  );

  const statusMessage = useMemo(() => {
    if (!capabilities.includes(PlayerCapabilities.append)) {
      return "Open a local Mcap file that supports read/write";
    }
    return undefined;
  }, [capabilities]);

  const addRow = useCallback(
    (index: number) => {
      setMetadata((draft) => {
        draft.entries.splice(index + 1, 0, { key: "", value: "" });
      });
    },
    [setMetadata],
  );

  const removeRow = useCallback(
    (index: number) => {
      setMetadata((draft) => {
        if (draft.entries.length > 1) {
          draft.entries.splice(index, 1);
        }
      });
    },
    [setMetadata],
  );

  const formattedStartTime = currentTime ? formatTime(currentTime) : "-";

  return (
    <Stack fullHeight>
      <PanelToolbar />
      <Stack flex="auto" gap={1} padding={1.5} position="relative">
        <Stack>
          <TextField
            variant="outlined"
            label="Name"
            className={classes.textarea}
            size="small"
            placeholder="Metadata Name"
            value={metadataName}
            onChange={(event) => {
              setMetadataName(event.target.value);
            }}
            error={nameError != undefined}
          />
        </Stack>
        <div className={classes.grid}>
          <FormControl>
            <FormLabel>Start Time</FormLabel>
            <Typography paddingY={1}>{formattedStartTime}</Typography>
          </FormControl>
          <TextField
            value={metadata.duration ?? ""}
            fullWidth
            label="Duration"
            onChange={(ev) => {
              const duration = Number(ev.currentTarget.value);
              setMetadata((oldMetadata) => ({
                ...oldMetadata,
                duration: duration > 0 ? duration : undefined,
              }));
            }}
            type="number"
            InputProps={{
              endAdornment: (
                <ToggleButtonGroup
                  className={classes.toggleButtonGroup}
                  size="small"
                  exclusive
                  value={metadata.durationUnit}
                  onChange={(_ev, durationUnit) => {
                    if (metadata.durationUnit !== durationUnit) {
                      setMetadata((old) => ({ ...old, durationUnit }));
                    }
                  }}
                >
                  <ToggleButton className={classes.toggleButton} tabIndex={-1} value="sec">
                    sec
                  </ToggleButton>
                  <ToggleButton className={classes.toggleButton} tabIndex={-1} value="nsec">
                    nsec
                  </ToggleButton>
                </ToggleButtonGroup>
              ),
            }}
          />
          <ButtonGroup style={{ visibility: "hidden" }}>
            <IconButton tabIndex={-1} data-testid="add">
              <AddIcon />
            </IconButton>
            <IconButton tabIndex={-1}>
              <AddIcon />
            </IconButton>
          </ButtonGroup>
        </div>
        <div>
          <FormLabel>Metadata</FormLabel>
          <div className={classes.grid}>
            {metadata.entries.map(({ key, value }, index) => {
              const hasDuplicate = ((key.length > 0 ? countedMetadata[key] : undefined) ?? 0) > 1;
              return (
                <div className={classes.row} key={index}>
                  <TextField
                    fullWidth
                    value={key}
                    autoFocus={index === 0}
                    placeholder="Key (string)"
                    error={hasDuplicate}
                    // onKeyDown={onMetaDataKeyDown}
                    onChange={(evt) => {
                      updateMetadata(index, "key", evt.currentTarget.value);
                    }}
                  />
                  <TextField
                    fullWidth
                    value={value}
                    placeholder="Value (string)"
                    error={hasDuplicate}
                    onChange={(evt) => {
                      updateMetadata(index, "value", evt.currentTarget.value);
                    }}
                  />
                  <ButtonGroup>
                    <IconButton
                      tabIndex={-1}
                      onClick={() => {
                        addRow(index);
                      }}
                    >
                      <AddIcon />
                    </IconButton>
                    <IconButton
                      tabIndex={-1}
                      onClick={() => {
                        removeRow(index);
                      }}
                      style={{
                        visibility: metadata.entries.length > 1 ? "visible" : "hidden",
                      }}
                    >
                      <RemoveIcon />
                    </IconButton>
                  </ButtonGroup>
                </div>
              );
            })}
          </div>
        </div>

        <Stack
          direction="row"
          justifyContent="flex-end"
          alignItems="center"
          overflow="hidden"
          flexGrow={0}
          gap={1.5}
        >
          {(nameError != undefined || statusMessage != undefined) && (
            <Typography variant="caption" noWrap color={nameError ? "error" : undefined}>
              {nameError ?? statusMessage}
            </Typography>
          )}
          <Tooltip
            placement="left"
            title={config.buttonTooltip}
          >
            <span>
              <Button
                className={classes.button}
                variant="contained"
                disabled={!canWriteMetadata}
                onClick={onAddMetadataClicked}
              >
                {config.buttonText}
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>
    </Stack>
  );
}

export default Panel(
  Object.assign(React.memo(WriteMetadata), {
    panelType: "Metadata",
    defaultConfig,
  }),
);
