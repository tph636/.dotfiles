return {
    {
        "mason-org/mason.nvim",
        opts = {},
    },

    {
        "mason-org/mason-lspconfig.nvim",
        dependencies = {
            "neovim/nvim-lspconfig",
        },
        opts = {
            ensure_installed = {
                "ts_ls",
                "pyright",
                "lua_ls",
                "jsonls",
                "html",
                "cssls",
                "bashls",
                "yamlls",
                "dockerls",
            },
        },
    },

    {
        "neovim/nvim-lspconfig",
        config = function()
            vim.lsp.config("*", {
                capabilities = require("blink.cmp").get_lsp_capabilities(),
            })

            vim.lsp.enable({
                "ts_ls",
                "pyright",
                "lua_ls",
                "jsonls",
                "html",
                "cssls",
                "bashls",
                "yamlls",
                "dockerls",
            })
        end,
    },
}
