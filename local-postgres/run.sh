#!/bin/sh

CONTAINER_NAME=pg-homerelay

dirpath="$(cd `dirname local-postgres/run.sh`; pwd)"
keypath="$dirpath/keys"

# get pw/port from .env file
pw=$(grep '^DATABASE_URL=' `dirname $dirpath`/.env | grep -o '[^:]*@' | grep -o '[^@]*')
port=$(grep '^DATABASE_URL=' `dirname $dirpath`/.env | grep -o 'localhost:\d*' | cut -c 11-)

# Since heroku uses SSL with self-signed certificate, let's mimic that
# https://gist.github.com/mrw34/c97bb03ea1054afb551886ffc8b63c3b

if [ -f "$keypath"/server.crt -a -f "$keypath"/server.key ]
then
    echo 'key found'
else
    echo 'generating keys'
    mkdir "$keypath" >/dev/null 2>/dev/null
    openssl req -new -text -passout pass:qpeifunpqeiufb -subj /CN=localhost -out "$keypath"/server.req -keyout "$keypath"/privkey.pem
    openssl rsa -in "$keypath"/privkey.pem -passin pass:qpeifunpqeiufb -out "$keypath"/server.key
    openssl req -x509 -in "$keypath"/server.req -text -key "$keypath"/server.key -out "$keypath"/server.crt
    chmod 600 "$keypath"/server.key
fi

mkdir "$dirpath"/data >/dev/null 2>/dev/null

docker run --rm -d \
    --name $CONTAINER_NAME \
    -p $port:5432 \
    -v "$dirpath"/data:/var/lib/postgresql/data \
    -v "$keypath"/server.crt:/var/lib/postgresql/server.crt \
    -v "$keypath"/server.key:/var/lib/postgresql/server.key \
    -e POSTGRES_PASSWORD="$pw" \
    postgres:alpine \
    -c ssl=on \
    -c ssl_cert_file=/var/lib/postgresql/server.crt \
    -c ssl_key_file=/var/lib/postgresql/server.key
