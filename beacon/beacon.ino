#undef CONFIG_ARDUHAL_ESP_LOG

#include "nvs_flash.h"
#include <esp_gap_ble_api.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEAdvertising.h>
#include <BLEServer.h>
#include "esp_bt_device.h"

//#include <WiFi.h>
//#include <WiFiUDP.h>
#include <sstream>
#include <iomanip>

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
String ble_name = "odo_15";

//const char* wifi_ssid = "forest3";
//const char* wifi_password = "pygmalion";

//WiFiUDP udp;
//int udp_port = 2021;
//char udp_packet_buffer[255];

BLEAdvertising *pAdvertising;

void setupAsEmitter() {
  BLEDevice::init("Long name works now");
  BLEServer *pServer = BLEDevice::createServer();
  BLEService *pService = pServer->createService(SERVICE_UUID);
  BLECharacteristic *pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE
  );

  pCharacteristic->setValue("");
  pService->start();
  pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x0006);
  pAdvertising->setMaxPreferred(0x0006);
  pAdvertising->setChannelMap(ADV_CHNL_39);
  BLEDevice::startAdvertising();
}

void setup() {
  //Serial.begin(115200);
  //Serial.println();
  
  nvs_flash_init();

  BLEDevice::init("");
  esp_bt_dev_set_device_name(ble_name.c_str());
  setupAsEmitter();
  
  /*int status = WL_IDLE_STATUS;
  
  while (status != WL_CONNECTED) {
    Serial.print("WiFi connecting to ");
    Serial.print(wifi_ssid);
    Serial.println(".");

    status = WiFi.begin(wifi_ssid, wifi_password);
    delay(10000);
  }
  
  Serial.println();
  Serial.print("WiFi Connected, IP address: ");
  Serial.println(WiFi.localIP());

  udp.begin(udp_port);
  */
}

void loop() {
  /*int udp_packet_size = udp.parsePacket();
  if (udp_packet_size) {
    Serial.print("Received packet of size ");
    Serial.println(udp_packet_size);
    Serial.print("From ");
    IPAddress udp_remote_ip = udp.remoteIP();
    Serial.print(udp_remote_ip);
    Serial.print(", port ");
    Serial.println(udp.remotePort());

    int len = udp.read(udp_packet_buffer, 255);
    if (len > 0) udp_packet_buffer[len] = 0;
    
    Serial.print("Contents:");
    Serial.println(udp_packet_buffer);

    if (strcmp(udp_packet_buffer, "reset") == 0) {
      Serial.println("Resetting.");
      pAdvertising->stop();
      pAdvertising->start();
    }
  }*/
}
