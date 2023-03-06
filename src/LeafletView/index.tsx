import React, { useCallback, useEffect, useRef, useState } from 'react';
import { WebView } from 'react-native-webview';
import { readAsStringAsync } from 'expo-file-system';
import { useAssets } from 'expo-asset';
import {
  MapMarker,
  WebviewLeafletMessage,
  MapMessage,
  WebViewLeafletEvents,
  MapLayer,
  MapShape,
  OwnPositionMarker,
  OWN_POSTION_MARKER_ID,
} from './types';
import { LatLng } from 'react-leaflet';
import { NativeSyntheticEvent, StyleSheet } from 'react-native';
import {
  WebViewError,
  WebViewMessageEvent,
} from 'react-native-webview/lib/WebViewTypes';
import LoadingIndicator from '../LoadingIndicator';

const LEAFLET_HTML_SOURCE = () => {
  const [index] = useAssets(
    require('../../android/src/main/assets/leaflet.html')
  );

  const [html, setHtml] = useState('');

  if (index) {
    readAsStringAsync(index[0].localUri as string).then((data) => {
      setHtml(data);
    });
  }

  return html;
};

const DEFAULT_MAP_LAYERS = [
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    baseLayerIsChecked: true,
    baseLayerName: 'OpenStreetMap.Mapnik',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
];

const DEFAULT_ZOOM = 15;

export type LeafletViewProps = {
  renderLoading?: () => React.ReactElement;
  onError?: (syntheticEvent: NativeSyntheticEvent<WebViewError>) => void;
  onLoadEnd?: () => void;
  onLoadStart?: () => void;
  onMessageReceived?: (message: WebviewLeafletMessage) => void;
  mapLayers?: MapLayer[];
  mapMarkers?: MapMarker[];
  mapShapes?: MapShape[];
  mapCenterPosition?: LatLng;
  ownPositionMarker?: OwnPositionMarker;
  zoom?: number;
  doDebug?: boolean;
  androidHardwareAccelerationDisabled?: boolean;
};

const LeafletView: React.FC<LeafletViewProps> = ({
  renderLoading,
  onError,
  onLoadEnd,
  onLoadStart,
  onMessageReceived,
  mapLayers,
  mapMarkers,
  mapShapes,
  mapCenterPosition,
  ownPositionMarker,
  zoom,
  doDebug,
  androidHardwareAccelerationDisabled,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [initialized, setInitialized] = useState(false);

  const logMessage = useCallback(
    (message: string) => {
      if (doDebug) {
        console.log(message);
      }
    },
    [doDebug]
  );

  const sendMessage = useCallback(
    (payload: MapMessage) => {
      webViewRef.current?.injectJavaScript(
        `window.postMessage(${JSON.stringify(payload)}, '*');`
      );
    },
    [logMessage]
  );

  const sendInitialMessage = useCallback(() => {
    let startupMessage: MapMessage = {};

    if (mapLayers) {
      startupMessage.mapLayers = mapLayers;
    }
    if (mapMarkers) {
      startupMessage.mapMarkers = mapMarkers;
    }
    if (mapCenterPosition) {
      startupMessage.mapCenterPosition = mapCenterPosition;
    }
    if (mapShapes) {
      startupMessage.mapShapes = mapShapes;
    }
    if (ownPositionMarker) {
      startupMessage.ownPositionMarker = {
        ...ownPositionMarker,
        id: OWN_POSTION_MARKER_ID,
      };
    }
    startupMessage.zoom = zoom;

    setInitialized(true);
    logMessage('sending initial message');
  }, [
    logMessage,
    mapCenterPosition,
    mapLayers,
    mapMarkers,
    mapShapes,
    ownPositionMarker,
    sendMessage,
    zoom,
  ]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const data = event?.nativeEvent?.data;
      if (!data) {
        return;
      }

      const message: WebviewLeafletMessage = JSON.parse(data);

    

      onMessageReceived && onMessageReceived(message);
    },
    [logMessage, onMessageReceived, sendInitialMessage]
  );

  //Handle mapLayers update
  useEffect(() => {
    if (!initialized) {
      return;
    }
    sendMessage({ mapLayers });
  }, [initialized, mapLayers, sendMessage]);

  //Handle mapMarkers update
  useEffect(() => {
    if (!initialized) {
      return;
    }
    sendMessage({ mapMarkers });
  }, [initialized, mapMarkers, sendMessage]);

  //Handle mapShapes update
  useEffect(() => {
    if (!initialized) {
      return;
    }
    sendMessage({ mapShapes });
  }, [initialized, mapShapes, sendMessage]);

  //Handle ownPositionMarker update
  useEffect(() => {
    if (!initialized || !ownPositionMarker) {
      return;
    }
    sendMessage({
      ...ownPositionMarker,
      id: OWN_POSTION_MARKER_ID,
    });
  }, [initialized, ownPositionMarker, sendMessage]);

  //Handle mapCenterPosition update
  useEffect(() => {
    if (!initialized) {
      return;
    }
    sendMessage({ mapCenterPosition });
  }, [initialized, mapCenterPosition, sendMessage]);

  //Handle zoom update
  useEffect(() => {
    if (!initialized) {
      return;
    }
    sendMessage({ zoom });
  }, [initialized, zoom, sendMessage]);

  return (
    <WebView
      containerStyle={styles.container}
      ref={webViewRef}
      javaScriptEnabled={true}
      onLoadEnd={onLoadEnd}
      onLoadStart={onLoadStart}
      onMessage={handleMessage}
      domStorageEnabled={true}
      startInLoadingState={true}
      onError={onError}
      originWhitelist={['*']}
      renderLoading={renderLoading}
      source={{ html: LEAFLET_HTML_SOURCE() }}
      allowFileAccess={true}
      allowUniversalAccessFromFileURLs={true}
      allowFileAccessFromFileURLs={true}
      androidHardwareAccelerationDisabled={androidHardwareAccelerationDisabled}
    />
  );
};

LeafletView.defaultProps = {
  renderLoading: () => <LoadingIndicator />,
  mapLayers: DEFAULT_MAP_LAYERS,
  zoom: DEFAULT_ZOOM,
  doDebug: __DEV__,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...StyleSheet.absoluteFillObject,
  },
});

export default LeafletView;
