# Theme
autoload -U colors && colors
PS1="%{$(tput setaf 48)%}%~%{$(tput sgr0)%} "

# Aliases
alias ls='ls -a --color=auto'
alias grep='grep --color=auto'
# alias for hist to show history in easily searchable format
hist() {
  local selected
  selected=$(fc -l 1 | tac | sed 's/^[[:space:]]*[0-9]\+[[:space:]]*//' | fzf --no-sort --height 40%)
  [[ -n "$selected" ]] && print -z -- "$selected"
}
zle -N hist
bindkey '^R' hist


# Set history file path first
HISTSIZE=10000
SAVEHIST=10000
HISTFILE=~/.cache/zsh/history

# Make sure history directory exists
if [ ! -d "$(dirname $HISTFILE)" ]; then
  mkdir -p "$(dirname $HISTFILE)"
fi

# Set Zsh history options
setopt APPEND_HISTORY
setopt INC_APPEND_HISTORY
setopt SHARE_HISTORY
setopt HIST_IGNORE_DUPS
setopt HIST_REDUCE_BLANKS


# Autocomplete
autoload -U compinit
zstyle ':completion:*' menu select
zmodload zsh/complist
compinit
_comp_options+=(globdots)  # Include hidden files
