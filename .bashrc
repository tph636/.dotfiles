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
alias dc="docker compose up --build -d"
alias gs="git status"
alias gl="git log"
alias gb='git branch'
alias ..="cd .."
alias ...="cd ../.."
alias ....="cd ../../.."
alias py="python3"

###############################################
# fzf-powered history search
###############################################

# Bind Ctrl-R to search
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
# Bash history settings (no duplicates)
###############################################
HISTSIZE=10000
HISTFILESIZE=10000
HISTCONTROL=ignoredups:erasedups
shopt -s histappend

###############################################
# Ensure history file exists
###############################################
HISTFILE="$HOME/.bash_history"
touch "$HISTFILE"

###############################################
# Bash completion (if available)
###############################################
if [ -f /etc/bash_completion ]; then
    . /etc/bash_completion
elif [ -f /usr/share/bash-completion/bash_completion ]; then
    . /usr/share/bash-completion/bash_completion
fi

###############################################
# fzf integration (if installed)
###############################################
if command -v fzf >/dev/null 2>&1; then
    # Load fzf keybindings if available
    if [ -f ~/.fzf.bash ]; then
        . ~/.fzf.bash
    fi
fi

