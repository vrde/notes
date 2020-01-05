# Sync your node

`parity` has a nice **warp** feature.

## I want to use HDD


This section covers Neo4j I/O behavior, and how to optimize for operations on disk.

Databases often produce many small and random reads when querying data, and few sequential writes when committing changes.

By default, most Linux distributions schedule IO requests using the Completely Fair Queuing (CFQ) algorithm, which provides a good balance between throughput and latency. The particular IO workload of a database, however, is better served by the Deadline scheduler. The Deadline scheduler gives preference to read requests, and processes them as soon as possible. This tends to decrease the latency of reads, while the latency of writes goes up. Since the writes are usually sequential, their lingering in the IO queue increases the change of overlapping or adjacent write requests being merged together. This effectively reduces the number of writes that are sent to the drive.

On Linux, the IO scheduler for a drive, in this case sda, can be changed at runtime like this:

$ echo 'deadline' > /sys/block/sda/queue/scheduler
$ cat               /sys/block/sda/queue/scheduler
noop [deadline] cfq

Another recommended practice is to disable file and directory access time updates. This way, the file system won’t have to issue writes that update this meta-data, thus improving write performance. This can be accomplished by setting the noatime,nodiratime mount options in fstab, or when issuing the disk mount command.

[9.6. Linux file system tuning - Chapter 9. Performance](https://neo4j.com/docs/operations-manual/current/performance/linux-file-system-tuning/)

## My commands
```
fdisk /dev/sdb
mke2fs -t ext4 -O ^has_journal /dev/sdb2
mount -o noatime /dev/sdb1 /data
echo deadline > /sys/block/sda/queue/scheduler
parity --base-path=/data/parity/ethereum --no-serve-light --cache-size-queue=1024 --cache-size-state=8192 --max-peers=50
```


## Links
* [Improving Linux System Performance with I/O Scheduler Tuning | via @codeship](https://blog.codeship.com/linux-io-scheduler-tuning/)
* [Tune Your Hard Disk with hdparm » Linux Magazine](http://www.linux-magazine.com/Online/Features/Tune-Your-Hard-Disk-with-hdparm)
* [Tips for optimizing disk performance on Linux](http://blackbird.si/tips-for-optimizing-disk-performance-on-linux/)
* [5 ways to improve HDD speed on Linux | The Code Artist](https://thecodeartist.blogspot.com/2012/06/improving-hdd-performance-linux.html)
* [performance - Optimize Linux file system for reading ~500M small files - Server Fault](https://serverfault.com/questions/701793/optimize-linux-file-system-for-reading-500m-small-files)
* [9.6. Linux file system tuning - Chapter 9. Performance](https://neo4j.com/docs/operations-manual/3.4/performance/linux-file-system-tuning/)
* [How to disable/enable journaling on an ext4 filesystem :Cybergavin](http://cybergav.in/2011/11/15/how-to-disableenable-journaling-on-an-ext4-filesystem/)
* [linux - Disable journaling on ext4 filesystem partition - Super User](https://superuser.com/questions/516784/disable-journaling-on-ext4-filesystem-partition)
