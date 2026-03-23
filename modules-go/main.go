package main

import (
	"encoding/json"
	"fmt"
	"os"
)

// Node က ပို့လိုက်တဲ့ Data ပုံစံကို ဖမ်းဖို့ Struct (သံချည်ကွင်း)
type NodeRequest struct {
	Command string                 `json:"command"`
	Payload map[string]interface{} `json:"payload"`
}

// Node ကို ပြန်ပို့မယ့် Data ပုံစံ
type NodeResponse struct {
	Status  string      `json:"status"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

func main() {
	// 1. Argument ပါမပါ စစ်မယ်
	if len(os.Args) < 2 {
		sendError("No input data provided")
		return
	}

	rawInput := os.Args[1]
	var req NodeRequest

	// 2. Node က ပို့တဲ့ JSON ကို Go နားလည်အောင် ဖြည်မယ် (Unmarshal)
	err := json.Unmarshal([]byte(rawInput), &req)
	if err != nil {
		sendError(fmt.Sprintf("Invalid JSON input: %v", err))
		return
	}

	// 3. Command Dispatcher (ဘယ်အလုပ် ခိုင်းတာလဲ စစ်မယ်)
	switch req.Command {
	case "HEALTH_CHECK":
		sendSuccess("Muscle is perfectly healthy and ready!", nil)
		
	case "CALC_SYNERGY":
		// ဥပမာ: Payload ထဲက data ကိုယူပြီး တွက်မယ်
		result := fmt.Sprintf("Processed payload from Node: %v", req.Payload)
		sendSuccess("Calculation done", result)

	default:
		sendError(fmt.Sprintf("Unknown command: %s", req.Command))
	}
}

// အောက်က နှစ်ခုက Node ဆီကို JSON အဖြစ် ပြန်ပို့ပေးမယ့် Helper function တွေပါ
func sendSuccess(msg string, data interface{}) {
	res := NodeResponse{Status: "success", Message: msg, Data: data}
	out, _ := json.Marshal(res)
	fmt.Println(string(out)) // Node က stdout ကနေ ပြန်ဖတ်လိမ့်မယ်
}

func sendError(errMsg string) {
	res := NodeResponse{Status: "error", Message: errMsg}
	out, _ := json.Marshal(res)
	fmt.Println(string(out)) // Error ကိုလည်း JSON အဖြစ်ပဲ ပြန်ပို့မယ်
}
