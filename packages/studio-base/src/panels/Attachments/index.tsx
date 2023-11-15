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

import { Button, inputBaseClasses, TextField, Tooltip, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { makeStyles } from "tss-react/mui";

import Log from "@foxglove/log";
import { Attachment } from "@foxglove/studio";
import { useDataSourceInfo } from "@foxglove/studio-base/PanelAPI";
import Panel from "@foxglove/studio-base/components/Panel";
import PanelToolbar from "@foxglove/studio-base/components/PanelToolbar";
import Stack from "@foxglove/studio-base/components/Stack";
import useCallbackWithToast from "@foxglove/studio-base/hooks/useCallbackWithToast";
import useWriteAttachments from "@foxglove/studio-base/hooks/useWriteAttachments";
import { PlayerCapabilities } from "@foxglove/studio-base/players/types";
import { useDefaultPanelTitle } from "@foxglove/studio-base/providers/PanelStateContextProvider";
import { SaveConfig } from "@foxglove/studio-base/types/panels";

import { defaultConfig, useAttachmentPanelSettings } from "./settings";
import { AttachmentConfig } from "./types";


const log = Log.getLogger(__filename);

type Props = {
  config: AttachmentConfig;
  saveConfig: SaveConfig<AttachmentConfig>;
};

const useStyles = makeStyles<{ buttonColor?: string }>()((theme, { buttonColor }) => {
  const augmentedButtonColor = buttonColor
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
  };
});

function parseInput(value: string): { error?: string; parsedObject?: unknown } {
  let parsedObject;
  let error = undefined;
  try {
    const parsedAny: unknown = JSON.parse(value);
    if (Array.isArray(parsedAny)) {
      error = "Message content must be an object, not an array";
    } else if (parsedAny == null /* eslint-disable-line no-restricted-syntax */) {
      error = "Message content must be an object, not null";
    } else if (typeof parsedAny !== "object") {
      error = `Message content must be an object, not ‘${typeof parsedAny}’`;
    } else {
      parsedObject = parsedAny;
    }
  } catch (e) {
    error = value.length !== 0 ? e.message : "Enter valid message content as JSON";
  }
  return { error, parsedObject };
}

function WriteAttachment(props: Props) {
  const { saveConfig, config } = props;
  const { capabilities } = useDataSourceInfo();
  const { classes } = useStyles({ buttonColor: config.buttonColor });

  const [attachmentName, setAttachmentName] = useState<string>("");

  const writeAttachments = useWriteAttachments();

  const { error, parsedObject } = useMemo(() => parseInput(config.value ?? ""), [config.value]);
  const nameError = useMemo(() => {
    let errorWithName = undefined;
    if (attachmentName === "") {
      errorWithName = "Name must have a value";
    }
    return errorWithName;
  }, [attachmentName]);

  useAttachmentPanelSettings(config, saveConfig, ["application/json"]);

  const onAddAttachmentClicked = useCallbackWithToast(() => {
    const attachmentData = new TextEncoder().encode(parsedObject);
    const attachment: Attachment = { name: attachmentName, mediaType: config.datatype, data: attachmentData };
    log.info("writing attachments from attachment panel: ", attachment);

    if (parsedObject != undefined) {
      writeAttachments([attachment]);
    } else {
      throw new Error(`called _writeAttachment() when input was invalid`);
    }
  }, [attachmentName, config.datatype, parsedObject, writeAttachments]);

  const [, setDefaultPanelTitle] = useDefaultPanelTitle();

  useEffect(() => {
    setDefaultPanelTitle("Write Attachments");
  }, [setDefaultPanelTitle]);

  const canWriteAttachment = Boolean(
    capabilities.includes(PlayerCapabilities.append) &&
    config.value &&
    config.datatype &&
    attachmentName &&
    parsedObject != undefined,
  );

  const statusMessage = useMemo(() => {
    if (!capabilities.includes(PlayerCapabilities.append)) {
      return "Open a local Mcap file that supports read/write";
    }
    if (!config.datatype) {
      return "Configure a data type in the panel settings";
    }
    return undefined;
  }, [capabilities, config.datatype]);

  return (
    <Stack fullHeight>
      <PanelToolbar />
      <Stack flex="auto" gap={1} padding={1.5} position="relative">
        <Stack flexGrow="1">
          <Stack >
            <TextField
              variant="outlined"
              label="Name"
              className={classes.textarea}
              size="small"
              placeholder="Attachment Name"
              value={attachmentName}
              onChange={(event) => {
                setAttachmentName(event.target.value);
              }}
              error={nameError != undefined}
            />
          </Stack>
          <Stack flexGrow="1">
            <TextField
              variant="outlined"
              label="Data"
              className={classes.textarea}
              multiline
              size="small"
              placeholder="Enter message content as JSON"
              value={config.value}
              onChange={(event) => {
                saveConfig({ value: event.target.value });
              }}
              error={error != undefined}
            />
          </Stack>
        </Stack>
        <Stack
          direction="row"
          justifyContent="flex-end"
          alignItems="center"
          overflow="hidden"
          flexGrow={0}
          gap={1.5}
        >
          {(error != undefined || statusMessage != undefined) && (
            <Typography variant="caption" noWrap color={error ? "error" : undefined}>
              {error ?? statusMessage}
            </Typography>
          )}
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
                disabled={!canWriteAttachment}
                onClick={onAddAttachmentClicked}
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
  Object.assign(React.memo(WriteAttachment), {
    panelType: "Attachments",
    defaultConfig,
  }),
);
