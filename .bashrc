###############################################
# Prompt
###############################################
PS1='\[\e[38;5;34;1m\]\w\n\[\e[0m\]'

###############################################
# Aliases
###############################################
alias ls="ls --color=auto"
alias grep="grep --color=auto"
alias whoami="whoami && curl ident.me"
alias ..="cd .."
alias ...="cd ../.."
alias ....="cd ../../.."
cd() {
  builtin cd "$@" && ls
}
mkdir() {
  command mkdir -p -- "$1" && cd -- "$1"
}


###############################################
# Pi harness sandbox
###############################################
pi() {
  local git_bind=()
  [ -d "$PWD/.git" ] && git_bind=(--ro-bind "$PWD/.git" "$PWD/.git")

  # ~/.pi/agent contains symlinks that resolve (via ../../) to ~/.dotfiles/.pi,
  # so that directory must be visible inside the sandbox too.
  local dotpi_bind=()
  [ -d "$HOME/.dotfiles/.pi" ] && dotpi_bind=(--ro-bind "$HOME/.dotfiles/.pi" "$HOME/.dotfiles/.pi")

  # Node lives in /usr/bin on this host (no nvm). Resolve it so the PATH stays correct.
  local node_bin
  node_bin="$(dirname "$(readlink -f "$(command -v node)")")"

  # The host nsswitch.conf forces systemd-resolved, which can't run in the sandbox.
  # Use a per-run minimal nsswitch.conf (files dns) so classic /etc/resolv.conf DNS works.
  local nss_dir
  nss_dir="$(mktemp -d)" && printf 'hosts: files dns\n' > "$nss_dir/nsswitch.conf"
  trap 'rm -rf "$nss_dir"' RETURN INT TERM

  bwrap \
    --unshare-pid \
    --die-with-parent \
    --new-session \
    --ro-bind /usr /usr \
    --ro-bind /bin /bin \
    --ro-bind /lib /lib \
    --ro-bind /lib64 /lib64 \
    --ro-bind /etc/resolv.conf /etc/resolv.conf \
    --ro-bind "$nss_dir/nsswitch.conf" /etc/nsswitch.conf \
    --ro-bind /etc/hosts /etc/hosts \
    --ro-bind /etc/ssl /etc/ssl \
    --ro-bind /etc/ca-certificates /etc/ca-certificates \
    --proc /proc \
    --dev /dev \
    --tmpfs /tmp \
    --dir /home \
    --bind "$PWD" "$PWD" \
    "${git_bind[@]}" \
    --bind "$HOME/.pi" "$HOME/.pi" \
    --ro-bind "$HOME/.pi/agent/auth.json" "$HOME/.pi/agent/auth.json" \
    "${dotpi_bind[@]}" \
    --clearenv --setenv HOME "$HOME" \
    --setenv PATH "$node_bin:/usr/bin:/bin" \
    -- pi "$@"
}

###############################################
# Pi without the sandbox (YOLO mode)
###############################################
piyolo() {
  command pi "$@"
}
###############################################
# fzf history search
###############################################
bind -x '"\C-h": fzf_history_search'
fzf_history_search() {
    local prefix
    prefix="${READLINE_LINE:0:READLINE_POINT}"

    local selected
    selected=$(
        history \
        | sed 's/^[ ]*[0-9]\+[ ]*//' \
        | tac \
        | awk '!seen[$0]++' \
        | grep -E "^${prefix//\//\\/}" \
        | fzf --height 40% --no-sort \
              --query="$prefix" \
              --select-1 --exit-0 \
              --exact
    )

    if [[ -n "$selected" ]]; then
        READLINE_LINE="$selected"
        READLINE_POINT=${#selected}
    fi
}

###############################################
# fzf git switch 
###############################################
gsb() {
    local branch
    branch=$(
        git for-each-ref \
            --sort=-committerdate \
            --format='‰(refname:short)' refs/geads/ |
            fzf \
                --prompt="Switch to branch: " \
                --height=50% \
                --reverse
                --preview 'git log --oneline --decorate --color=always -n 15 {}'
    ) || return
    [[ -n "$branch" ]] && git switch "$branch"
}

###############################################
# Bash history settings (no duplicates)
###############################################
HISTSIZE=10000
HISTFILESIZE=10000
HISTCONTROL=ignoredups:erasedups
shopt -s histappend
HISTFILE="$HOME/.bash_history"
touch "$HISTFILE"

###############################################
# fzf integration (if installed)
###############################################
if command -v fzf >/dev/null 2>&1; then
    eval "$(fzf --bash)"
fi

###############################################
# PATH
###############################################
export PATH="$HOME/.local/bin:$PATH"
if [ -f ~/.env ]; then
  set -a
  . ~/.env
  set +a
fi
