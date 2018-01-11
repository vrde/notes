# [WIP] Docker and Docker Compose playground
Docker Compose is an amazing technology. I often rely on someone else's `docker-compose.yml`, and if something is not working I find myself hammering on some options (I don't fully understand) to try make it work, most of the time with no luck.

What I'm sharing here are some experiments that helped me understanding better Docker Compose. I made this document public hoping other creatures will find it useful.

I'm focusing on [Docker Compose version 3](https://docs.docker.com/compose/compose-file/) (unfortunately, they don't have a permanent URL for that specific version of the documentation), specifically on how to connect to containers from:
- the host
- another container run with `docker`
- another container in a `docker-compose.yml`

I'm skipping basic stuff like setting up your system with Docker and Docker Compose, if you need help just [duckduckgo](https://duckduckgo.com/) it.

You'll need to run multiple terminals, my personal preference is to use `tmux` because I can split the current window in multiple panels. I assume basic knowledge of the terminal, and a Posix-like system.

I almost forgot: as a generic humanoid carbon unit, I make mistakes. If you find something wrong please do a PR, if you don't understand something please open an issue.

# A simple server with `nc` (netcat)
`nc` is a pretty neat command to make TCP and UDP connections and servers.

## The basics
The very first step is to make our complex client side architecture work in our box. We will spawn a `nc` server, listening to port `8888`, and a client, that will connect to the server to send a message. Doing this in your host is pretty simple. Again, everything is running on `localhost`, starting a server and connecting to it is as easy as it sounds. On a terminal, run the server:
```
nc -l -p 8888
```

On a different terminal, send a message to the server:
```
echo hello | nc localhost 8888
```
*Exit by hitting `ctrl+c`.*

You should now see `hello` on the terminal of the server.

## Using Docker
In this section we will mainly use the command `docker`.

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

Why does this work? In this example, Docker is publishing the port `8888` on the host to the port `8888` of the container (the option is `-p8888:8888`). But this is boring. Let's spice up our example.

#### Playing with networks
This is something I wish I understood before.

We start the server as before, we name the container with `--name ncserver`, but we don't publish the port this time:
```
docker run --rm --name ncserver alpine nc -l -p 8888
```

But how do we connect to it? Where is it running? Docker's networking behaviour is quite interesting. Before digging into details, let's find out our container IP address:

```
docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ncserver
```

In my machine, the IP is `172.17.0.2`. To send a "hello" to it, run again the command you saw the previous section, changing the host to the newly discovered IP:
```
echo hello | nc 172.17.0.2 8888
```

#### What happened here?
If you don't specify a network when running a container, Docker attaches it to the default network. You can verify this with `docker inspect ncserver` in the `Networks` section of the output. The default network is called `bridge`, and your `ncserver` should be connected there.

For more fun, let's see what the kernel IP with `route -n`:
```
$ route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
...
172.17.0.0      0.0.0.0         255.255.0.0     U     0      0        0 docker0
...
```

Interestingly enough, the IP of our container `ncserver` is in the subnet `172.17.0.0`, so packages from and to `172.17.0.2` go through the (virtual) internface `docker0`.

If we query for the status of that interface with `ifconfig docker0`, we have something like that:

```
$ ifconfig docker0
docker0: flags=4099<UP,BROADCAST,MULTICAST>  mtu 1500
        inet 172.17.0.1  netmask 255.255.0.0  broadcast 0.0.0.0
        [...]
```

If you don't find it particularly interesting, wait to see how it works with Docker Compose.


### Docker to Docker
In this section we run two containers and connect them. Now things are a bit more interesting. Start the server as before:
```
docker run --rm alpine nc -l -p 8888
```

How do you connect the client to our server? In the "Host to Docker" example, we opened a connection from `localhost` to a specific host in a different network. The kernel took care of routing the request to the correct host through the interface `docker0`. If we want to connect a Docker container to another one, since they run in the same network we can just use IP addresses. The IP of the container `ncserver` should be the same as before, `172.17.0.2`. We can simply do:
```
docker run --rm alpine sh -c 'echo hello | nc 172.17.0.2 8888'
```

This should connect to the other container and send our mildly entertaining "hello" message. Note we had to wrap the command in `sh -c '...'` in order to execute the pipe command inside the container, and not in the current terminal.

## Using Docker Compose
Where we explore how to do things with—you guessed right—Docker Compose!

### Host to Docker Compose
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
docker-compose run --rm ncserver
```

OK, time to connect to our webscale™ `nc` server from our host. The difference from the previous scenario is that in this case Docker Compose creates an **ad hoc virtual network** for the **services** listed in `docker-compose.yml`. Using some of the commands I showed before, we can start understanding how this thing works. First, let's check the IP address of the newly launched `ncserver`. Note that the name of the container depends on the directory where the configuration file is:
```
$ docker ps
CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS                  PORTS               NAMES
afd69fa6e2a8        alpine              "nc -l -p 8888"     2 second ago        Up 1 second                       dockercomposeplayground_ncserver_1
```

OK, so the name of my container is `dockercomposeplayground_ncserver_1`, short, simple, and easy to remember. The IP of the container is:
```
$ docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' dockercomposeplayground_ncserver_1
172.18.0.2
```

Now that we have the IP of the container, we can easily talk to it:
```
echo hello | nc 172.18.0.2 8888
```

Yay, it works!

#### What happened here?
The network where the container is connected is `172.18.0.0`. Let's dig more, and check the routing tables of the kernel:
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
NETWORK ID          NAME                              DRIVER              SCOPE
9a834ebdf75c        bridge                            bridge              local
083ed51d3bc1        dockercomposeplayground_default   bridge              local
d70f3f0de048        host                              host                local
dce8e03e2ab9        none                              null                local
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

# Further reading
I suggest you to take 20 minutes and read [Docker container networking](https://docs.docker.com/engine/userguide/networking/).

