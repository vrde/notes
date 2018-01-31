# Stuff I find interesting about Python 3

## How to be lazy with `any`
`any` is a nice built-in function:
```
any(iterable, /)
    Return True if bool(x) is True for any x in the iterable.

    If the iterable is empty, return False.
```

`any` is smart enough to stop iterating when the condition is matched. Let's see some examples.

First, we need a class that tells us when we access a property (it can be just a method, but I want to be fancy here), and we need also some instances.

```python
In [3]: class N:
   ...:     def __init__(self, x):
   ...:         self._x = x
   ...:     @property
   ...:     def x(self):
   ...:         print('Accessing x, value is', self._x)
   ...:         return self._x

In [4]: l = [N(x) for x in range(10)]
```

As you might guess, if we access the property `x` of an element in the list, we get a message:

```python
In [7]: l[5].x
Accessing x, value is 5
Out[7]: 5
```

Things are starting to get interesting when we use lists in combination with `any`, but we need to really understand how to be **truly lazy**. In the following example, we are using a list comprehension:
```python
In [8]: any([n for n in l if n.x == 1])
Accessing x, value is 0
Accessing x, value is 1
Accessing x, value is 2
Accessing x, value is 3
Accessing x, value is 4
Accessing x, value is 5
Accessing x, value is 6
Accessing x, value is 7
Accessing x, value is 8
Accessing x, value is 9
Out[8]: True
```

As you can see, all values in the list are accessed. This is because we are **first** iterating through the list `l` checking **all** values, and filtering out anything that is not equal to `1`. The execution of the list comprehension will return a list of only one element, specifically `[1]`.

But we can do better! The function we are using is `any`, that is equivalent to the [logical quantifier `∃`](https://en.wikipedia.org/wiki/Existential_quantification), so we can stop iterating when we find the first element that satisfy our condition. See what happens when we remove the square brackets from the expression:

```python
In [9]: any(n for n in l if n.x == 1)
Accessing x, value is 0
Accessing x, value is 1
Out[9]: True
```

Nice! `any` stopped at the first element satisfying our condition!
