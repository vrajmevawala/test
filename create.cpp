#include<iostream>
#include<bits/stdc++.h>
using namespace std;

class node {
public:
    int data;
    node* left;
    node* right;

    node(int data) {
        this->data = data;
        left = right = NULL;
    }
};

vector<int> v;

node* Insert(node* root, int data) {
    if (root == NULL) {
        return new node(data);
    }
    if (data < root->data) {
        root->left = Insert(root->left, data);
    } else if (data > root->data) {
        root->right = Insert(root->right, data);
    }
    return root;
}
void inorder(node* root) {
    if (root != NULL) {
        inorder(root->left);
        v.push_back(root->data);
        inorder(root->right);
    }
}


int KthSmallest(node* root, int k) {
    v.clear();
    inorder(root);
    if(v.size()<k){
        return -1;
    }
    int result =v[k-1];
    return result;
}

int main() {
    int preference;
    char check;
    node* root = NULL;
    do {
        cout << "Binary Search Tree\n";
        cout << "[1] Insert A Node\n[2] Display Inorder\n[3] Kth Smallest Element in BST\n[4] Exit\n";
        cout << "Enter Your Choice: ";
        cin >> preference;

        switch (preference) {
        case 1: {
            int data;
            cout << "Enter The Data To Be Inserted (Enter -1 to cancel): ";
            cin >> data;
            if (data != -1) {
                root = Insert(root, data);
            } else {
                cout << "Insertion canceled.\n";
            }
            break;
        }
        case 2: {
            cout << "Inorder Traversal: ";
            inorder(root);
            cout << endl;
            break;
        }
        case 3: {
            int k;
            cout << "Enter value of k to find the k-th smallest element: ";
            cin >> k;
            int result = KthSmallest(root, k);
            if (result == -1) {
                cout << "Invalid value of k or tree is empty.\n";
            } else {
                cout << "The " << k << "-th smallest element is: " << result << endl;
            }
            break;
        }
        case 4: {
            cout << "Exiting...\n";
            return 0;
        }
        default:
            cout << "Invalid choice!\n";
        }

        cout << "Enter 'y' to continue: ";
        cin >> check;

    } while (check == 'y' || check == 'Y');

    return 0;
}
