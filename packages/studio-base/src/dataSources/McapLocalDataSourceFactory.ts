// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import Log from "@foxglove/log";
import {
  IDataSourceFactory,
  DataSourceFactoryInitializeArgs,
} from "@foxglove/studio-base/context/PlayerSelectionContext";
import {
  IterablePlayer,
  WorkerIterableSource,
  WorkerSourceAppender,
} from "@foxglove/studio-base/players/IterablePlayer";
import { Player } from "@foxglove/studio-base/players/types";

const log = Log.getLogger(__filename);

class McapLocalDataSourceFactory implements IDataSourceFactory {
  public id = "mcap-local-file";
  public type: IDataSourceFactory["type"] = "file";
  public displayName = "MCAP";
  public iconName: IDataSourceFactory["iconName"] = "OpenFile";
  public supportedFileTypes = [".mcap"];

  public initialize(args: DataSourceFactoryInitializeArgs): Player | undefined {
    const file = args.file;
    const handle = args.handle;
    if (!file) {
      return;
    }

    const source = new WorkerIterableSource({
      initWorker: () => {
        return new Worker(
          // foxglove-depcheck-used: babel-plugin-transform-import-meta
          new URL(
            "@foxglove/studio-base/players/IterablePlayer/Mcap/McapIterableSourceWorker.worker",
            import.meta.url,
          ),
        );
      },
      initArgs: { file },
    });

    log.info(source);

    const appender = new WorkerSourceAppender({
      initWorker: () => {
        return new Worker(
          // foxglove-depcheck-used: babel-plugin-transform-import-meta
          new URL(
            "@foxglove/studio-base/players/IterablePlayer/Mcap/McapSourceAppenderWorker.worker",
            import.meta.url,
          ),
        );
      },
      initArgs: { file, handle },
    });

    log.info(appender);

    return new IterablePlayer({
      metricsCollector: args.metricsCollector,
      source,
      appender,
      name: file.name,
      sourceId: this.id,
    });
  }
}

export default McapLocalDataSourceFactory;
