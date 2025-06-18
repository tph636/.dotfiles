# Theme
autoload -U colors && colors
PS1="%{$(tput setaf 48)%}%~%{$(tput sgr0)%} "

# Aliases
alias ls='ls -a --color=auto'
alias grep='grep --color=auto'

# History in cache directory
if [ ! -d "$(dirname $HISTFILE)" ]; then
  mkdir -p "$(dirname $HISTFILE)"
fi

setopt APPEND_HISTORY             # Append rather than overwrite history
setopt INC_APPEND_HISTORY         # Write to history immediately, not at shell exit
setopt SHARE_HISTORY              # Share history across all sessions
setopt HIST_IGNORE_DUPS           # Ignore duplicate commands
setopt HIST_REDUCE_BLANKS         # Remove superfluous blanks

HISTSIZE=10000
SAVEHIST=10000
HISTFILE=~/.cache/zsh/history

# Autocomplete
autoload -U compinit
zstyle ':completion:*' menu select
zmodload zsh/complist
compinit
_comp_options+=(globdots)  # Include hidden files
