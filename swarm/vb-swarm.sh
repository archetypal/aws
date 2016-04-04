export MSYS_NO_PATHCONV=1

MASTER_NAME=swarm-master-01
NODE1_NAME=swarm-node-01-01

# create machine as master
docker-machine create \
  -d virtualbox \
  $MASTER_NAME

eval $(docker-machine env $MASTER_NAME)

docker run \
  --name=consul \
  -d \
  -p 8500:8500 \
  progrium/consul -server -bootstrap

docker run \
  --name=swarm-manager \
  --restart=always \
  --net=host \
  -d \
  -p 0.0.0.0:3376:3376 \
  -v /var/lib/boot2docker:/etc/docker:ro \
  swarm manage \
    --tlsverify \
    --tlscacert=/etc/docker/ca.pem \
    --tlscert=/etc/docker/server.pem \
    --tlskey=/etc/docker/server-key.pem \
    -H tcp://0.0.0.0:3376 \
    --strategy spread \
    --advertise $(docker-machine ip $MASTER_NAME):3376 \
    consul://$(docker-machine ip $MASTER_NAME):8500/$MASTER_NAME

docker run  -d \
  --name shipyard-rethinkdb \
  --restart=always \
  -p 81:8080 \
  rethinkdb

docker run \
  --name shipyard-controller \
  --restart=always -d \
  --link shipyard-rethinkdb:rethinkdb \
  -v /var/lib/boot2docker:/etc/docker:ro \
  -p 80:8080 \
  shipyard/shipyard:latest \
  server \
    -docker tcp://$(docker-machine ip $MASTER_NAME):3376 \
    --disable-usage-info \
    --tls-ca-cert=/etc/docker/ca.pem \
    --tls-cert=/etc/docker/server.pem \
    --tls-key=/etc/docker/server-key.pem

# node
docker-machine create \
  -d virtualbox \
  --swarm \
  --swarm-discovery consul://$(docker-machine ip $MASTER_NAME):8500/$MASTER_NAME \
  $NODE1_NAME

# test swarm port
eval $(docker-machine env $MASTER_NAME)
export DOCKER_HOST=tcp://$(docker-machine ip $MASTER_NAME):3376
docker info

docker run --rm swarm list consul://$(docker-machine ip $MASTER_NAME):8500/$MASTER_NAME


# cleanup
docker-machine rm -f $MASTER_NAME
docker-machine rm -f $NODE1_NAME
