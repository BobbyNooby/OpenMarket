#!/bin/bash

# Follow logs from all services, or pass a service name: ./scripts/logs.sh server
docker compose logs -f ${1:---tail=50}
