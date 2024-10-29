package com.example;

/**
 * Hello world!
 *
 */
public class App 
{
    public String greet() {
        return redundantMethod();
    }

    private String redundantMethod() {
        if (false) {
            return "This is a code smell";
        }
        return "Hello, World!";
    }
}
