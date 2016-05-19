# Node.js Memory Usage

- [Node.js - process.memoryusage()](https://nodejs.org/api/process.html#process_process_memoryusage)
- [apmblog.dynatrace.com - memory leaks](http://apmblog.dynatrace.com/2015/11/04/understanding-garbage-collection-and-hunting-memory-leaks-in-node-js/)
- [jayonrod.com - v8 garbage collection](http://jayconrod.com/posts/55/a-tour-of-v8-garbage-collection)
- [risingstack - finding memory leak](https://blog.risingstack.com/finding-a-memory-leak-in-node-js/)


	---------------------------------
	|         Resident Set          |
	|                               |
	| ----------------------------- |
	| |       Code Segment        | |
	| ----------------------------- |
	| |           Stack           | |
	| | Local variables, pointers | |
	| ----------------------------- |
	| |           Heap            | |
	| |     Objects, Closures     | |
	| |                           | |
	| | ------------------------- | |
	| | |      Used Heap        | | |	
	| | ------------------------- | |
	| ----------------------------- |
    |                               |
    ---------------------------------


#### process.memoryusage()

    console.log(util.inspect(process.memoryUsage()));

    // result
    { 
		rss: 4935680,        // Resident Set Size
		heapTotal: 1826816,  // Total Size of the Heap
		heapUsed: 650472     // Heap actually Used
	}



#### 
Node.js tries to use about 1.5 GBs of memory. For systems with less memory you can use a command line flag.

	node --max_old_space_size=400 server.js --production  