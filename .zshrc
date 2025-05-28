# Theme
autoload -U colors && colors
PS1="%{$(tput setaf 48)%}%~%{$(tput sgr0)%} "

# Aliases
alias ls='ls -a --color=auto'
alias grep='grep --color=auto'

# History in cache directory
HISTSIZE=10000
SAVEHIST=10000
HISTFILE=~/.cache/zsh/history

# Autocomplete
autoload -U compinit
zstyle ':completion:*' menu select
zmodload zsh/complist
compinit
_comp_options+=(globdots)  # Include hidden files
