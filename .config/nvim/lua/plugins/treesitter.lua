return {
  {
    "nvim-treesitter/nvim-treesitter",
    lazy = false,
    build = ":TSUpdate",
    config = function()
      require("nvim-treesitter").install({
        "lua",
        "javascript",
        "typescript",
        "tsx",
        "html",
        "css",
        "json",
        "gitignore",
        "python",
      })

      vim.api.nvim_create_autocmd("FileType", {
        pattern = {
          "lua",
          "javascript",
          "typescript",
          "typescriptreact",
          "html",
          "css",
          "json",
          "gitignore",
          "python",
        },
        callback = function()
            vim.treesitter.start()

            vim.bo.indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()"
            vim.opt_local.indentkeys:append("<>,-")
        end
    })
    end,
  },
}
