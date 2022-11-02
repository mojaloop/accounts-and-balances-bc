# Accounts and Balances Bounded Context

## Dependencies

### Kafka

#### Docker
```shell
$ docker run \
    --name c_kafka \
    -e NUM_PARTITIONS=10 \
    -e ADVERTISED_HOST=localhost \
    -p 2181:2181 \
    -p 9092:9092 \
    -d \
    johnnypark/kafka-zookeeper
```

### MongoDB

#### Docker
```shell
$ docker run \
    --name c_mongodb \
    -e MONGO_INITDB_ROOT_USERNAME=root \
    -e MONGO_INITDB_ROOT_PASSWORD=root \
    -p 27017:27017 \
    -d \
    mongo
```

#### MongoDB Shell
```shell
$ use admin

$ db.createUser({
    user: "accounts-and-balances-bc",
    pwd: "123456789",
    roles: [{role: "readWrite", db: "accounts_and_balances_bc"}]
})
```

### Elasticsearch

#### Docker
```shell
$ docker network create n_elasticsearch

$ docker run \
    --name c_elasticsearch \
    -e "discovery.type=single-node" \
    -e ES_JAVA_OPTS="-Xms512m -Xmx512m" \
    --net n_elasticsearch \
    -p 9200:9200 \
    -p 9300:9300 \
    -it \
    elasticsearch:8.4.3

(Detach from the container with Ctrl + p and Ctrl + q (first Ctrl + p and, right after, Ctrl + q).)

$ docker cp c_elasticsearch:/usr/share/elasticsearch/config/certs/http_ca.crt ./elasticsearch_http_ca.crt
```

#### HTTP Client
**POST/PUT** https://localhost:9200/_security/role/accounts-and-balances-bc
```json
{
    "indices": [
        {
            "names": [
                "accounts",
                "journal_entries"
            ],
            "privileges": ["all"]
        }
    ]
}
```
**POST/PUT** https://localhost:9200/_security/user/accounts-and-balances-bc
```json
{
    "password": "123456789",
    "roles": ["accounts-and-balances-bc"]
}
```
