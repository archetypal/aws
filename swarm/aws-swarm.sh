# Create swarm-master
docker-machine create \
    --driver amazonec2 \
    --amazonec2-region us-west-2 \
    --amazonec2-vpc-id vpc-cf0fc4ab \
    --amazonec2-zone a \
    --amazonec2-instance-type t2.micro \
    --amazonec2-security-group docker-machine \
    swarm-master

eval $(docker-machine env swarm-master)

# consule
docker run \
    -d \
    -p 8500:8500 \
    --name=consul \
    progrium/consul -server -bootstrap

# in case running in Windows GIT Bash, this prevents resolution of /
export MSYS_NO_PATHCONV=1


    --swarm \
    --swarm-master \
    --swarm-discovery token://5ec4fc8d9f00cd63d6accbc40ea2116c \


docker run  \
    -d \
    --restart=always \
    --name shipyard-rethinkdb \
    rethinkdb


docker run \
    --restart=always -d \
    -v /etc/docker:/etc/docker:ro \
    --name shipyard-controller \
    --link shipyard-rethinkdb:rethinkdb \
    -p 80:8080 \
    shipyard/shipyard:latest \
    server -docker tcp://$(docker-machine ip swarm-master):3376 --disable-usage-info \
      --tls-ca-cert=/etc/docker/ca.pem --tls-cert=/etc/docker/server.pem --tls-key=/etc/docker/server-key.pem

unset MSYS_NO_PATHCONV

eval $(docker-machine env --swarm swarm-master)
