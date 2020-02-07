Replace libraries/BLE/BLEAdvertising.{cpp,h} with the ones here. They add the setChannelMap option. Unless we aren't going to use that anymore, in which case don't worry about it and just comment out pAdvertising->setChannelMap(ADV_CHNL_37);

