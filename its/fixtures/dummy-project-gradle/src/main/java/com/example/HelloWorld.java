package com.example;

public class HelloWorld {

    public String greet() {
        return redundantMethod();  // This method is unnecessary
    }

    private String redundantMethod() {
        return "Hello, World!";
    }
}
