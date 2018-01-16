# Docker and Docker Compose networking playground
I'm sharing some experiments that helped me understanding better Docker and Docker Compose from a **networking** level. I made this document public hoping other creatures will find it useful.

I'm focusing on Docker 17.05 (Community Edition, don't get me started with the name) and [Docker Compose version 3](https://docs.docker.com/compose/compose-file/) (unfortunately, they don't have a permanent URL for that specific version of the documentation), specifically on how to connect to containers from:
- the host
- another container run with `docker`
- another container in a `docker-compose.yml`

I'm skipping basic stuff like setting up your system with Docker and Docker Compose, if you need help just [duckduckgo](https://duckduckgo.com/) it.

You'll need to run multiple terminals, my personal preference is to use `tmux` because I can split the current window in multiple panels. I assume basic knowledge of the terminal, and a Posix-like system.

As a generic humanoid carbon unit, I make mistakes. If you find something wrong please do a PR, if you don't understand something please open an issue.

# A simple server with `nc` (netcat)
`nc` is a pretty neat command to make TCP and UDP connections and servers. The following examples will use two `nc` processes, one for the server and one for the client.

## The basics
The very first step is to try out `nc` and create a simple client-server architecture in our machine (also called *host*). We will spawn a `nc` server, listening to port `8888`, and a client, that will connect to the server to send a message. Doing this in your host is pretty simple. Again, everything is running on `localhost`, starting a server and connecting to it is as easy as it sounds. On a terminal, run the server:
```
nc -l -p 8888
```

On a different terminal, send a message to the server:
```
echo hello | nc localhost 8888
```

You should now see `hello` on the terminal of the server.

*Exit by hitting `ctrl+c`.*

## Using Docker
In this section we will use the command `docker`.

### Host to Docker
What happens if we run the server in a Docker container, and we connect to it from the host? Let's *containerize* it first:
```
docker run -p8888:8888 --rm alpine nc -l -p 8888
```

Now we have to options. We can connect from the host or from another container. Let's start connecting the client from the host.
```
echo hello | nc localhost 8888
```

As in the previous example, you should see `hello` in the containerized server.

Why does this work? In this example, Docker is publishing the port `8888` on the host to the port `8888` of the container (the option is `-p8888:8888`). Even if it works, it's kinda boring. Let's spice up our example.

#### Playing with networks (aka, something I wish I understood earlier)
We start the server as before, and we name the container with `--name ncserver`. This time we don't publish the port:
```
docker run --rm --name ncserver alpine nc -l -p 8888
```

How do we connect to it? Where is it running? Docker's networking behaviour is quite interesting. Before digging into details, let's find out our container IP address:

```
docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ncserver
```

In my machine, the IP is `172.17.0.2`. To send a "hello" to it, run again the command you saw the previous section, changing the host to the newly discovered IP:
```
echo hello | nc 172.17.0.2 8888
```

#### What happened here?
If you don't specify a network when running a container, Docker attaches it to the default network. You can verify this with `docker inspect ncserver` in the `Networks` section of the output. The default network is called `bridge`, and your `ncserver` should be connected there.

For even more fun, let's see what the kernel IP routing table looks like:
```
$ route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
...
172.17.0.0      0.0.0.0         255.255.0.0     U     0      0        0 docker0
...
```

Interestingly enough, the IP of our container `ncserver` is in the subnet `172.17.0.0`, so packages *from* and *to* `172.17.0.2` go through the (virtual) interface `docker0`.

If we query for the status of that interface with `ifconfig docker0`, we have something like that:

```
$ ifconfig docker0
docker0: flags=4099<UP,BROADCAST,MULTICAST>  mtu 1500
        inet 172.17.0.1  netmask 255.255.0.0  broadcast 0.0.0.0
        [...]
```

If you don't find it particularly interesting, wait to see how it works with Docker Compose.


### Docker to Docker
In this section we run two containers and connect them, and things are starting to be interesting. Start the server as before:
```
docker run --rm alpine nc -l -p 8888
```

How do we connect client and server? In the "Host to Docker" example, we opened a connection from `localhost` to a specific host in a different network. The kernel took care of routing the request to the correct host through the interface `docker0`. In this case, the two docker containers run in the same network. The IP of the container `ncserver` should be the same as before, `172.17.0.2`. We can simply do:
```
docker run --rm alpine sh -c 'echo hello | nc 172.17.0.2 8888'
```

This should connect to the `ncserver` container and send our mildly entertaining "hello" message to it. Note we had to wrap the command in `sh -c '...'` in order to execute the pipe command inside the container, and not in the current terminal.

IP addresses can change, so using them is not ideal, and hardcoding them in a script is even worse. Docker provides an [embedded DNS server](https://docs.docker.com/engine/userguide/networking/configure-dns/) for user-defined networks. We will see in a moment how this works together with Docker Compose.

## Using Docker Compose
Where we explore how to do things with—you guessed right—Docker Compose!

### Host to Docker Compose
*Note: this section [doesn't work](https://docs.docker.com/docker-for-mac/networking/#known-limitations-use-cases-and-workarounds) if you are using Docker for mac.*

We start by creating a simple `docker-compose.yml` file that runs the `nc` server:
```
version: '3'

services:
    ncserver:
        image: alpine
        command: nc -l -p 8888
```

To run the service, type:
```
docker-compose up ncserver
```

OK, time to connect to our webscale™ `nc` server. We will do it from our host. The difference from the previous scenario is that in this case Docker Compose creates an **ad hoc virtual network** for the **services** listed in `docker-compose.yml`. Using some of the commands I showed before, we can start understanding how this thing works. First, let's check the IP address of the newly launched `ncserver`. Note that the name of the container depends on the directory where the configuration file is:
```
$ docker ps
CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS                  PORTS               NAMES
afd69fa6e2a8        alpine              "nc -l -p 8888"     2 second ago        Up 1 second                       dockercompose_ncserver_1
```

OK, so the name of my container is `dockercompose_ncserver_1`, short, simple, and easy to remember. The IP of the container is:
```
$ docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' dockercompose_ncserver_1
172.18.0.2
```

Now that we have the IP of the container, we can easily talk to it:
```
echo hello | nc 172.18.0.2 8888
```

Yay, it works!

#### What happened here?
The network where the container is connected is `172.18.0.0`. If you remember, in the Docker examples the newtork was `172.17.0.0`. What happened? Let's dig more, and check the routing tables of the kernel:
```
$ route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
[...]
172.17.0.0      0.0.0.0         255.255.0.0     U     0      0        0 docker0
172.18.0.0      0.0.0.0         255.255.0.0     U     0      0        0 br-083ed51d3bc1
[...]
```

Seems like we have a new friend, and its name is `br-083ed51d3bc1`:
```
$ ifconfig br-083ed51d3bc1
br-083ed51d3bc1: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 172.18.0.1  netmask 255.255.0.0  broadcast 0.0.0.0
        [...]
```

This is reflected also in the list of networks managed by Docker:
```
$ docker network ls
NETWORK ID          NAME                       DRIVER              SCOPE
9a834ebdf75c        bridge                     bridge              local
083ed51d3bc1        dockercompose_default      bridge              local
d70f3f0de048        host                       host                local
dce8e03e2ab9        none                       null                local

```

### Set up a proper Docker Compose
A Docker Compose file with just one service is not that useful. Let's try to add our client in the configuration. The new `docker-compose.yml` file should look like this:
```
version: '3'

services:
    ncserver:
        image: alpine
        command: nc -l -p 8888
    ncclient:
        image: alpine
        depends_on:
            - ncserver
        command: sh -c 'echo hello | nc ncserver 8888'
```

You can run everything with the simple command:
```
docker-compose up
```

If you see in the logs `ncserver_1  | hello`, congrats, everything went as expected! `docker-compose up` does a lot of things (it *builds, (re)creates, starts, and attaches to containers for a service*), take a minute to read the output of `docker-compose up -h`, it will really help you understand what this command does.

#### The embedded DNS server
As you might have noticed, we didn't use IP addresses this time, but hostnames. This is something we have for free by using user-defined networks, and Docker Compose (as we saw before) creates a new network for us. This allow us to refer to other containers by the name specified under `services`.

Let's query the embedded DNS server. First, start `ncserver`:
```
docker-compose up ncserver
```

The server will hang waiting for connections. Now run:
```
docker-compose run --rm nclient sh
```

To query the DNS server I usually use `dig`. In *alpine* a similar command is `drill`. We need to update the package manager and install the software:
```
apk update
apk add drill
```

Now are ready to query the DNS server:
```
/ # drill ncserver
;; ->>HEADER<<- opcode: QUERY, rcode: NOERROR, id: 64349
;; flags: qr rd ra ; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 0
;; QUESTION SECTION:
;; ncserver.    IN      A

;; ANSWER SECTION:
ncserver.       600     IN      A       172.20.0.2

;; AUTHORITY SECTION:

;; ADDITIONAL SECTION:

;; Query time: 0 msec
;; SERVER: 127.0.0.11
;; WHEN: Tue Jan 16 11:01:29 2018
;; MSG SIZE  rcvd: 50
```

*Note: I didn't find a way to query the DNS server from the host, if you have an idea on how to do it please tell me.*


# Further reading
I suggest you to take 20 minutes and read [Docker container networking](https://docs.docker.com/engine/userguide/networking/).

