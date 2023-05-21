#!/usr/bin/env bash

OS="$(cat /etc/[A-Za-z]*[_-][rv]e[lr]* | grep "^ID=" | cut -d= -f2 | uniq | tr '[:upper:]' '[:lower:]' | tr -d '"')"
SUB_OS="$(cat /etc/[A-Za-z]*[_-][rv]e[lr]* | grep "^ID_LIKE=" | cut -d= -f2 | uniq | tr '[:upper:]' '[:lower:]' | tr -d '"')"

function install_generic() {
  local dependency="${1}"
  local os="${2}"

  if [[ "${os}" == "debian" ]]; then
    sudo apt-get update
    sudo apt-get install -y "${dependency}"
    return 0
  elif [[ "${os}" == "ubuntu" || "${os}" == "pop" ]]; then
    sudo apt-get update
    sudo apt-get install -y "${dependency}"
    return 0
  elif [[ "${os}" == "centos" ]]; then
    sudo yum install -y --allowerasing "${dependency}"
    return 0
  elif [[ "${os}" == "fedora" ]]; then
    sudo dnf -y install "${dependency}"
    return 0
  elif [[ "${os}" == "arch" ]]; then
    sudo pacman -Sy --noconfirm "${dependency}"
    return 0
  else
    return 1
  fi
}

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
    sudo pacman -Sy --noconfirm docker docker-compose
    sudo systemctl start docker.service
    sudo systemctl enable docker.service
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
    return 0
  else
    return 1
  fi
}

if ! command -v docker >/dev/null; then
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

function check_dependency_and_install() {
  local dependency="${1}"

  if ! command -v "${dependency}" >/dev/null; then
    echo "Installing ${dependency}"
    install_generic "${dependency}" "${OS}"
    install_result=$?

    if [[ install_result -eq 0 ]]; then
      echo "${dependency} installed"
    else
      echo "Your system ${OS} is not supported trying with sub_os ${SUB_OS}"
      install_generic "${dependency}" "${SUB_OS}"
      install_sub_result=$?

      if [[ install_sub_result -eq 0 ]]; then
        echo "${dependency} installed"
      else
        echo "Your system ${SUB_OS} is not supported please install ${dependency} manually"
        exit 1
      fi
    fi
  fi
}

check_dependency_and_install "git-all"
check_dependency_and_install "jq"
check_dependency_and_install "fswatch"
check_dependency_and_install "openssl"
