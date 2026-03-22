package main

import (
	"encoding/json"
	"fmt"
	"os"
)

type DBStructure struct {
	Nodes map[string]interface{} `json:"nodes"`
}

func main() {
	fmt.Println("🔍 [Go Muscle] Reading Node's Mosaic Data...")

	// လမ်းကြောင်းကို root ကနေရော၊ modules-go ထဲကနေပါ ရှာနိုင်အောင် လုပ်မယ်
	paths := []string{"data/local_db.json", "../data/local_db.json"}
	var file []byte
	var err error

	for _, p := range paths {
		file, err = os.ReadFile(p)
		if err == nil {
			break
		}
	}

	if err != nil {
		fmt.Println("❌ Error: Could not find local_db.json")
		return
	}

	var db DBStructure
	json.Unmarshal(file, &db)

	orderCount := 0
	for path := range db.Nodes {
		if len(path) > 7 && path[:7] == "orders/" {
			orderCount++
		}
	}

	fmt.Printf("📊 Total Orders found by Go: %d\n", orderCount)
    
	if orderCount > 0 {
		fmt.Println("🚀 Synergy Level: EXCELLENT. Ready for Production Logic.")
	} else {
		fmt.Println("⚠️  Synergy Connected, but no orders found in DB.")
	}
}
