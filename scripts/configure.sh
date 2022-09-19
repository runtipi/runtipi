#!/usr/bin/env bash
ROOT_FOLDER="$(readlink -f "$(dirname "${BASH_SOURCE[0]}")"/..)"

echo
echo "======================================"
if [[ -f "${ROOT_FOLDER}/state/configured" ]]; then
  echo "=========== RECONFIGURING ============"
else
  echo "============ CONFIGURING ============="
fi
echo "=============== TIPI ================="
echo "======================================"
echo

function install_docker() {
  local os="${1}"
  echo "Installing docker for os ${os}" >/dev/tty

  if [[ "${os}" == "debian" ]]; then
    sudo apt-get update
    sudo apt-get upgrade
    sudo apt-get install -y ca-certificates curl gnupg lsb-release
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    return 0
  elif [[ "${os}" == "ubuntu" || "${os}" == "pop" ]]; then
    sudo apt-get update
    sudo apt-get upgrade
    sudo apt-get install -y ca-certificates curl gnupg lsb-release
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    return 0
  elif [[ "${os}" == "centos" ]]; then
    sudo yum install -y yum-utils
    sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    sudo yum install -y --allowerasing docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo systemctl start docker
    sudo systemctl enable docker
    return 0
  elif [[ "${os}" == "fedora" ]]; then
    sudo dnf -y install dnf-plugins-core
    sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
    sudo dnf -y install docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo systemctl start docker
    sudo systemctl enable docker
    return 0
  elif [[ "${os}" == "arch" ]]; then
    sudo pacman -Sy --noconfirm docker
    sudo systemctl start docker.service
    sudo systemctl enable docker.service

    if ! command -v crontab >/dev/null; then
      sudo pacman -Sy --noconfirm cronie
      systemctl enable --now cronie.service
    fi

    return 0
  else
    return 1
  fi
}

function update_docker() {
  local os="${1}"
  echo "Updating Docker for os ${os}" >/dev/tty

  if [[ "${os}" == "debian" ]]; then
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    return 0
  elif [[ "${os}" == "ubuntu" || "${os}" == "pop" ]]; then
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    return 0
  elif [[ "${os}" == "centos" ]]; then
    sudo yum install -y --allowerasing docker-ce docker-ce-cli containerd.io docker-compose-plugin
    return 0
  elif [[ "${os}" == "fedora" ]]; then
    sudo dnf -y install docker-ce docker-ce-cli containerd.io docker-compose-plugin
    return 0
  elif [[ "${os}" == "arch" ]]; then
    sudo pacman -Sy --noconfirm docker docker-compose

    if ! command -v crontab >/dev/null; then
      sudo pacman -Sy --noconfirm cronie
      systemctl enable --now cronie.service
    fi

    return 0
  else
    return 1
  fi
}

function install_jq() {
  local os="${1}"
  echo "Installing jq for os ${os}" >/dev/tty

  if [[ "${os}" == "debian" || "${os}" == "ubuntu" || "${os}" == "pop" ]]; then
    sudo apt-get update
    sudo apt-get install -y jq
    return 0
  elif [[ "${os}" == "centos" ]]; then
    sudo yum install -y jq
    return 0
  elif [[ "${os}" == "fedora" ]]; then
    sudo dnf -y install jq
    return 0
  elif [[ "${os}" == "arch" ]]; then
    sudo pacman -Sy --noconfirm jq
    return 0
  else
    return 1
  fi
}

OS="$(cat /etc/[A-Za-z]*[_-][rv]e[lr]* | grep "^ID=" | cut -d= -f2 | uniq | tr '[:upper:]' '[:lower:]' | tr -d '"')"
SUB_OS="$(cat /etc/[A-Za-z]*[_-][rv]e[lr]* | grep "^ID_LIKE=" | cut -d= -f2 | uniq | tr '[:upper:]' '[:lower:]' | tr -d '"')"

if command -v docker >/dev/null; then
  echo "Docker is already installed, ensuring Docker is fully up to date"

  update_docker "${OS}"
  docker_result=$?

  if [[ docker_result -eq 0 ]]; then
    echo "Docker is fully up to date"
  else
    echo "Your system ${OS} is not supported trying with sub_os ${SUB_OS}"
    install_docker "${SUB_OS}"
    docker_sub_result=$?

    if [[ docker_sub_result -eq 0 ]]; then
      echo "Docker is fully up to date"
    else
      echo "Your system ${SUB_OS} is not supported please update Docker manually"
      exit 1
    fi
else
  install_docker "${OS}"
  docker_result=$?

  if [[ docker_result -eq 0 ]]; then
    echo "Docker installed"
  else
    echo "Your system ${OS} is not supported trying with sub_os ${SUB_OS}"
    install_docker "${SUB_OS}"
    docker_sub_result=$?

    if [[ docker_sub_result -eq 0 ]]; then
      echo "Docker installed"
    else
      echo "Your system ${SUB_OS} is not supported please install docker manually"
      exit 1
    fi
  fi
fi

if ! command -v jq >/dev/null; then
  install_jq "${OS}"
  jq_result=$?

  if [[ jq_result -eq 0 ]]; then
    echo "jq installed"
  else
    echo "Your system ${OS} is not supported trying with sub_os ${SUB_OS}"
    install_jq "${SUB_OS}"
    jq_sub_result=$?

    if [[ jq_sub_result -eq 0 ]]; then
      echo "jq installed"
    else
      echo "Your system ${SUB_OS} is not supported please install jq manually"
      exit 1
    fi
  fi
fi
