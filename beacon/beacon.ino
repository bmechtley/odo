#undef CONFIG_ARDUHAL_ESP_LOG

#include "nvs_flash.h"
#include <esp_gap_ble_api.h> // ESP32 BLE
#include <BLEDevice.h>
#include <BLEUtils.h>
#include "custom_ble_advertising.h"
#include <BLEServer.h>
#include "esp_bt_device.h"
#include <sstream>
#include <iomanip>

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
char* wifipass = "sdfdsfdsfds";
String ssid = "iStage10";

void setupAsEmitter() {
  BLEDevice::init("Long name works now");
  BLEServer *pServer = BLEDevice::createServer();
  BLEService *pService = pServer->createService(SERVICE_UUID);
  BLECharacteristic *pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE
  );

  pCharacteristic->setValue("");
  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMaxPreferred(0x12);
  pAdvertising->setChannelMap(ADV_CHNL_37);
  BLEDevice::startAdvertising();
}

void setup() {
  Serial.begin(115200);
  nvs_flash_init();

  BLEDevice::init("");
  esp_bt_dev_set_device_name(ssid.c_str());
  setupAsEmitter();
}

void loop() {
  delay(100);
}
