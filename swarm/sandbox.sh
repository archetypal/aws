# in case running in Windows GIT Bash, this prevents resolution of /
export MSYS_NO_PATHCONV=1

docker-machine create -d virtualbox manager
docker-machine create -d virtualbox agent1

eval $(docker-machine env manager)
export CLUSTER_ID=$(docker run --rm swarm create)

docker run \
  -d \
  -p 3376:3376 \
  -t \
  -v /var/lib/boot2docker:/certs:ro \
  swarm manage -H 0.0.0.0:3376 \
    --tlsverify \
    --tlscacert=/certs/ca.pem \
    --tlscert=/certs/server.pem \
    --tlskey=/certs/server-key.pem \
    token://$CLUSTER_ID

eval $(docker-machine env agent1)
docker run \
  -d swarm join \
  --addr=$(docker-machine ip agent1):2376 \
  token://$CLUSTER_ID

eval $(docker-machine manager --swarm)


# cleanup
docker-machine rm manager
docker-machine rm agent1
