vim.g.mapleader = " "
vim.g.maplocalleader = " "

require("config.lazy")
require("config.set")
require("config.remap")

vim.diagnostic.config({
    virtual_lines = {
        current_line = true,
    },
})

