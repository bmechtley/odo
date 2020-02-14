if [ `adb devices | wc -l` -gt "2" ]; then cordova run android; fi;

