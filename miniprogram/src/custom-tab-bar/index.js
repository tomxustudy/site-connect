Component({
    data: {
        selected: 0,
        color: "#9ca3af",
        selectedColor: "#1976d2",
        list: [{
            pagePath: "/pages/index/index",
            text: "记录"
        }, {
            pagePath: "/pages/my-records/index",
            text: "管理"
        }]
    },
    methods: {
        switchTab(e) {
            const data = e.currentTarget.dataset
            const url = data.path
            wx.switchTab({ url })
        }
    }
})
