var spooks = ["3D","4D","4.21-bit","5.0","5g","6g","8-bit","128-bit","10x engineer","adversarial","agile","AI","algorithm","always-online","as a Service","Assistant","big data","bitcoin","black box","blast processing","blockchain","brain interface","buffer overflow","C++","CI/CD","cloud","Code of Conduct","coin","combinator","crowdfunding","crowdsourcing","crypto","cyber","data mining","database","decentralized","deep learning","deep web","DevOps","discrimination","E2EE","easy deployment","edge computing","encrypted","enterprise","emoji support","event-driven","federated","floating point","fog-computing","FPGA","free","functional","gaming","garbage collection","generative","generator","graphics","hardcoded","hardware","hash","infinite","instruction manual","IoT","Java","keylogger","L-system","lifelike","linear search","list","localhost","lootbox","low-latency","machine learning","man-in-the-middle","microservice","minimalist","Mixed Reality","memristor","mobile","monads","Murphy's Law","nanoscale","natural language","neural network","new","next-gen","Node.js","nondeterministic","NSA backdoor","object-oriented","one-click","open-source","pornbot","predictive","prisoner's dilemma","programming","programming","public key","Python","quantum","quantum-resistant","racist","radiation hardening","recursive","REST","row hammer","SaaS","scalable","scientific","secure","server","sexist","simulation","smart TV","software","sort","SQL injection","string","structured","surveillance","telnet","token ring","type system","unaccountability","unicode","vintage","VR","wireless","worm","XML","zero-day"];

commands.push(new Command("csspook",function(param){
	let num = Number.parseInt(param) || 4;
	let string = '';

	for(i = 0; i < num; i++) {
		string += spooks[Math.floor(Math.random() * spooks.length)] + ' ';
	}
	localModuleMessage(string);
}))
