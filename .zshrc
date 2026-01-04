###############################################
# Colors + Prompt
###############################################
autoload -U colors && colors
PS1="%{$(tput setaf 48)%}%~%{$(tput sgr0)%} "

###############################################
# Aliases
###############################################
alias ls='ls --color=auto'
alias grep='grep --color=auto'

###############################################
# fzf-powered history search (prefix-only, no duplicates)
###############################################
hist() {
  local prefix selected
  prefix=$LBUFFER

  selected=$(
    fc -l 1 \
    | tac \
    | sed 's/^[[:space:]]*[0-9]\+[[:space:]]*//' \
    | awk '!seen[$0]++' \
    | grep -E "^${prefix//\//\\/}" \
    | fzf --no-sort --height 40% --query="$prefix" --select-1 --exit-0
  )

  [[ -n "$selected" ]] && print -z -- "$selected"
}
zle -N hist
bindkey '^R' hist

###############################################
# History settings (no duplicates)
###############################################
HISTSIZE=10000
SAVEHIST=10000
HISTFILE=~/.cache/zsh/history

# Ensure directory exists
if [ ! -d "$(dirname $HISTFILE)" ]; then
  mkdir -p "$(dirname $HISTFILE)"
fi

setopt APPEND_HISTORY
setopt INC_APPEND_HISTORY
unsetopt SHARE_HISTORY
setopt HIST_IGNORE_DUPS
setopt HIST_IGNORE_ALL_DUPS
setopt HIST_SAVE_NO_DUPS
setopt HIST_REDUCE_BLANKS

###############################################
# Autocomplete
###############################################
autoload -U compinit
zstyle ':completion:*' menu select
zmodload zsh/complist
compinit
comp_options+=(globdots)

