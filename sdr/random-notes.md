# Random notes about SDR

Those commands are related to the ubuntu image that has beed used during the course.

## Programs

### Listen to random things!
```bash
$ gqrx
```

### Listen to airplanes!

```bash
$ cd bin/dump1090
$ dump1090 --net --interactive
```

### Listen to FM radio!
Download `fm.grc` and run it on `gnuradio-companion`.

```bash
$ gnuradio-companion
```

### Locate cell towers!
https://opencellid.org/


### Becoming a cell tower!
/usr/local/etc/yate/yate.conf
/usr/local/etc/yate/subscribers.conf
/usr/local/etc/yate/ybts.conf
/usr/local/share/yate/scripts/nib.js
/usr/local/etc/yate/tmsidata.conf


### Listen to IMSI ids!
```
$ cd bin/IMSI_catcher
$ sudo python simple_IMSI-catcher.py

...

$ grgsm_livemon -f 935800000
```


### Listen to packets!
```
sudo wireshark -k -Y '!icmp && gsmtap' -i lo
```

### Listen to satellites!
http://www.teske.net.br/lucas/2016/02/recording-noaa-apt-signals-with-gqrx-and-rtl-sdr-on-linux/
